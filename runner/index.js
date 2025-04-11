const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');
const { Client } = require('ssh2');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ALGORITHM = 'aes-256-gcm';
function decrypt(encryptedData, keyBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get the next execution number for a job configuration
 */
async function getNextExecutionNumber(configId) {
  try {
    const { data, error } = await supabase
      .from('jobs_run')
      .select('execution_number')
      .eq('config_id', configId)
      .order('execution_number', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return 1; // First execution
    }
    
    return (data[0].execution_number || 0) + 1;
  } catch (error) {
    console.error(`[@runner:getNextExecutionNumber] Error: ${error.message}`);
    return 1; // Default to 1 if there's an error
  }
}

/**
 * Update job run status with optional additional data
 */
async function updateJobRunStatus(id, status, additionalData = {}) {
  try {
    if (!id) return;
    
    const updates = { 
      status, 
      updated_at: new Date().toISOString(),
      ...additionalData
    };
    
    // Set timestamp based on status
    if (status === 'running') {
      updates.started_at = new Date().toISOString();
    } else if (['completed', 'failed', 'cancelled'].includes(status)) {
      updates.completed_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('jobs_run')
      .update(updates)
      .eq('id', id);
      
    if (error) {
      console.error(`[@runner:updateJobRunStatus] Error updating job run ${id}: ${error.message}`);
    } else {
      console.log(`[@runner:updateJobRunStatus] Updated job run ${id} status to ${status}`);
    }
  } catch (error) {
    console.error(`[@runner:updateJobRunStatus] Error: ${error.message}`);
  }
}

async function processJob() {
  let jobRunId = null;
  let startTime = new Date().toISOString();
  try {
    const queueLength = await redis.llen('jobs_queue');
    console.log(`[@runner:processJob] Current queue length: ${queueLength} jobs`);

    const queueContents = await redis.lrange('jobs_queue', 0, -1);
    console.log(`[@runner:processJob] Full queue contents: ${JSON.stringify(queueContents)}`);

    const job = await redis.rpop('jobs_queue');
    if (!job) {
      console.log(`[@runner:processJob] Queue is empty, skipping...`);
      return;
    }

    console.log(`[@runner:processJob] Processing job, ${queueLength - 1} jobs remaining in queue`);
    console.log(`[@runner:processJob] Raw job data (typeof): ${typeof job}`);
    console.log(`[@runner:processJob] Raw job data: ${JSON.stringify(job)}`);
    const { config_id, timestamp, requested_by } = typeof job === 'string' ? JSON.parse(job) : job;

    // Create a job run record with status 'pending'
    const { data: jobRun, error: jobRunError } = await supabase
      .from('jobs_run')
      .insert({
        config_id,
        status: 'pending',
        created_at: startTime,
        queued_at: timestamp || startTime,
        execution_parameters: { requested_by },
        worker_id: process.env.WORKER_ID || `worker-${Math.random().toString(36).substring(2, 9)}`,
        execution_attempt: 1,
        // Get execution_number as max + 1
        execution_number: await getNextExecutionNumber(config_id)
      })
      .select()
      .single();

    if (jobRunError) {
      console.error(`[@runner:processJob] Failed to create job run: ${jobRunError.message}`);
      return;
    }

    jobRunId = jobRun.id;
    console.log(`[@runner:processJob] Created job run: ${jobRunId}`);

    // Update job run to 'running'
    await supabase
      .from('jobs_run')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        // Store execution parameters in the logs field (JSON)
        execution_parameters: { 
          requested_by,
          timestamp
        }
      })
      .eq('id', jobRunId);

    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('config')
      .eq('id', config_id)
      .single();
    if (error || !data) {
      console.error(`[@runner:processJob] Failed to fetch config ${config_id}: ${error?.message}`);
      await updateJobRunStatus(jobRunId, 'failed', {
        error: `Failed to fetch config: ${error?.message || 'Unknown error'}`,
        logs: { error: `Failed to fetch config: ${error?.message || 'Unknown error'}` }
      });
      return;
    }

    const config = data.config;
    console.log(`[@runner:processJob] Config fetched: ${JSON.stringify(config)}`);
    const hosts = config.hosts || [];
    const repoUrl = config.repository;
    const branch = config.branch || 'main'; // Default to 'main' if not specified
    const repoName = repoUrl.split('/').pop().replace('.git', ''); // e.g., 'automai'
    const scripts = (config.scripts || [])
      .map((script) => `${script.path} ${script.parameters}`)
      .join(' && ');
    console.log(`[@runner:processJob] Scripts to execute: ${scripts}`);

    for (const host of hosts) {
      console.log(
        `[@runner:processJob] Processing host: ${host.ip}, OS: ${host.os}, Username: ${host.username}, AuthType: ${host.authType || 'not specified'}`,
      );
      let sshKeyOrPass = host.key || host.password;
      if (!sshKeyOrPass) {
        const errorMsg = `No authentication credentials provided for host ${host.ip}`;
        console.error(`[@runner:processJob] ${errorMsg}`);
        await updateJobRunStatus(jobRunId, 'failed', {
          error: errorMsg,
          output: { stderr: errorMsg },
          logs: { error: errorMsg }
        });
        continue;
      }

      if (host.authType === 'privateKey' && sshKeyOrPass.includes(':')) {
        try {
          sshKeyOrPass = decrypt(sshKeyOrPass, process.env.ENCRYPTION_KEY);
          console.log(
            `[@runner:processJob] Decrypted key preview: ${sshKeyOrPass.slice(0, 50)}...`,
          );
        } catch (decryptError) {
          const errorMsg = `Decryption failed: ${decryptError.message}`;
          console.error(`[@runner:processJob] ${errorMsg}`);
          await updateJobRunStatus(jobRunId, 'failed', {
            error: errorMsg,
            output: { stderr: errorMsg },
            logs: { error: errorMsg }
          });
          continue;
        }
      } else {
        console.log(
          `[@runner:processJob] Using plain key/password: ${sshKeyOrPass.slice(0, 50)}...`,
        );
      }

      // Construct script with repo cleanup, clone, cd, checkout branch, and execute scripts
      let fullScript;
      
      if (host.os === 'windows') {
        // Windows-specific command formatting with echo statements for debugging
        const cleanupCommand = `echo "Cleaning up repository" && if exist ${repoName} (echo "Removing existing directory" && rmdir /s /q ${repoName}) else echo "Directory not found, skipping cleanup"`;
        const cloneCommand = `echo "Cloning repository from ${repoUrl}" && git clone ${repoUrl} ${repoName}`;
        const cdCommand = `echo "Changing to directory ${repoName}" && cd ${repoName}`;
        const checkoutCommand = `echo "Checking out branch ${branch}" && git checkout ${branch}`;
        const scriptsCommand = `echo "Running scripts: ${scripts}" && ${scripts}`;
        
        // For Windows, we'll use an explicit, properly escaped command with error checking
        fullScript = `${cleanupCommand} && ${cloneCommand} && ${cdCommand} && ${checkoutCommand} && ${scriptsCommand} && echo "Command execution complete"`;
        
        console.log(`[@runner:processJob] Windows command: ${fullScript}`);
      } else {
        // Unix/Linux command with echo statements for debugging
        const cleanupCommand = `echo "Cleaning up repository" && rm -rf ${repoName}`;
        const cloneCommand = `echo "Cloning repository from ${repoUrl}" && git clone ${repoUrl} ${repoName}`;
        const cdCommand = `echo "Changing to directory ${repoName}" && cd ${repoName}`;
        const checkoutCommand = `echo "Checking out branch ${branch}" && git checkout ${branch}`;
        const scriptsCommand = `echo "Running scripts: ${scripts}" && ${scripts}`;
        
        // Add debugging output and error handling
        fullScript = `${cleanupCommand} && ${cloneCommand} && ${cdCommand} && ${checkoutCommand} && ${scriptsCommand} && echo "Command execution complete"`;
        
        console.log(`[@runner:processJob] Unix command: ${fullScript}`);
      }
      console.log(`[@runner:processJob] Full SSH command: ${fullScript}`);

      console.log(`[@runner:processJob] Connecting to SSH host ${host.ip}:${host.port || 22} with username ${host.username}`);

      const conn = new Client();
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error(`[@runner:processJob] Connection timeout to ${host.ip}`);
        conn.end();
        // Update job run to failed status
        updateJobRunStatus(jobRunId, 'failed', {
          error: `Connection timeout to ${host.ip}`,
          output: { stderr: `Connection timeout to ${host.ip}` },
          logs: { error: `Connection timeout to ${host.ip}` }
        });
      }, 30000); // 30 seconds timeout
      
      conn
        .on('ready', () => {
          // Clear timeout on successful connection
          clearTimeout(connectionTimeout);
          console.log(`[@runner:processJob] SSH connected to ${host.ip}`);
          
          // For Windows hosts, wrap in cmd.exe
          const execCommand = host.os === 'windows' 
            ? `cmd.exe /c "${fullScript}"` 
            : fullScript;
          
          console.log(`[@runner:processJob] Running command: ${execCommand}`);
          
          // Set a command execution timeout - if the command takes too long, abort it
          const execTimeout = setTimeout(() => {
            console.error(`[@runner:processJob] Command execution timeout after 10 minutes on ${host.ip}`);
            try {
              conn.end();
            } catch (e) {
              console.error(`[@runner:processJob] Error ending connection: ${e.message}`);
            }
            
            // Update job run to failed status
            updateJobRunStatus(jobRunId, 'failed', {
              error: `Command execution timeout after 10 minutes on ${host.ip}`,
              output: { 
                stderr: `Command execution timeout after 10 minutes on ${host.ip}`,
                stdout: `Command was: ${execCommand}`
              },
              logs: { 
                error: `Command execution timeout after 10 minutes on ${host.ip}`,
                command: execCommand,
                host: {
                  ip: host.ip,
                  port: host.port || 22,
                  username: host.username,
                  os: host.os
                },
                duration: 10 * 60 * 1000 // 10 minutes in milliseconds
              }
            });
          }, 10 * 60 * 1000); // 10 minutes timeout
          
          conn.exec(execCommand, async (err, stream) => {
            // We'll clear the exec timeout when the stream closes
            if (err) {
              clearTimeout(execTimeout); // Clear the exec timeout on error
              
              const errorMsg = `SSH exec error: ${err.message}`;
              console.error(`[@runner:processJob] ${errorMsg}`);
              await updateJobRunStatus(jobRunId, 'failed', {
                error: errorMsg,
                output: { stderr: errorMsg },
                logs: { 
                  error: errorMsg,
                  command: execCommand,
                  host: {
                    ip: host.ip,
                    port: host.port || 22,
                    username: host.username,
                    os: host.os
                  }
                }
              });
              conn.end();
              return;
            }
            let output = { stdout: '', stderr: '' };
            
            // Flag to track if we've received any data
            let receivedData = false;
            let stdoutTimeout, stderrTimeout;
            
            // Set up a timeout check to log if no data is received
            const noDataTimeout = setTimeout(() => {
              if (!receivedData) {
                console.log(`[@runner:processJob] WARNING: No data received after 10 seconds`);
              }
            }, 10000);
            
            console.log(`[@runner:processJob] Stream setup complete, waiting for data...`);
            
            // Attach listeners with extra debug info
            stream
              .on('data', (data) => {
                receivedData = true;
                clearTimeout(noDataTimeout);
                
                // Clear any existing timeout for this stream
                if (stdoutTimeout) clearTimeout(stdoutTimeout);
                
                const dataStr = data.toString('utf8').trim();
                if (dataStr) {
                  output.stdout += dataStr + '\n';
                  console.log(`[@runner:processJob] SSH stdout (${new Date().toISOString()}): ${dataStr}`);
                }
                
                // Set a timeout to log if no more data is received
                stdoutTimeout = setTimeout(() => {
                  console.log(`[@runner:processJob] No more stdout data received for 5 seconds`);
                }, 5000);
              })
              .stderr.on('data', (data) => {
                receivedData = true;
                clearTimeout(noDataTimeout);
                
                // Clear any existing timeout for this stream
                if (stderrTimeout) clearTimeout(stderrTimeout);
                
                const dataStr = data.toString('utf8').trim();
                if (dataStr) {
                  output.stderr += dataStr + '\n';
                  console.log(`[@runner:processJob] SSH stderr (${new Date().toISOString()}): ${dataStr}`);
                }
                
                // Set a timeout to log if no more data is received
                stderrTimeout = setTimeout(() => {
                  console.log(`[@runner:processJob] No more stderr data received for 5 seconds`);
                }, 5000);
              })
              .on('exit', (code, signal) => {
                console.log(`[@runner:processJob] SSH exit event with code ${code}, signal: ${signal}`);
              })
              .on('close', async (code, signal) => {
                // Clear all timeouts
                clearTimeout(noDataTimeout);
                clearTimeout(execTimeout);
                if (stdoutTimeout) clearTimeout(stdoutTimeout);
                if (stderrTimeout) clearTimeout(stderrTimeout);
                
                console.log(`[@runner:processJob] SSH stream closed with code ${code}, signal: ${signal}`);
                console.log(`[@runner:processJob] Final stdout (${output.stdout.length} chars): ${output.stdout.substring(0, 500)}${output.stdout.length > 500 ? '...(truncated)' : ''}`);
                console.log(`[@runner:processJob] Final stderr (${output.stderr.length} chars): ${output.stderr.substring(0, 500)}${output.stderr.length > 500 ? '...(truncated)' : ''}`);
                
                if (!receivedData) {
                  console.log(`[@runner:processJob] WARNING: No data was received from the SSH connection`);
                }
                
                const successful = code === 0;
                
                // Update the job run with the final status and output
                await updateJobRunStatus(jobRunId, successful ? 'completed' : 'failed', {
                  output,
                  logs: {
                    ...output,
                    command: execCommand,
                    host: {
                      ip: host.ip,
                      port: host.port || 22,
                      username: host.username,
                      os: host.os
                    },
                    exitCode: code,
                    exitSignal: signal,
                    duration: Date.now() - new Date(startTime).getTime()
                  },
                  error: !successful ? `Command exited with code ${code}` : null
                });
                
                conn.end();
              });
          });
        })
        .on('error', async (err) => {
          // Clear the connection timeout on error
          clearTimeout(connectionTimeout);
          
          const errorMsg = `SSH connection error: ${err.message}`;
          console.error(`[@runner:processJob] ${errorMsg}`);
          await updateJobRunStatus(jobRunId, 'failed', {
            error: errorMsg,
            output: { stderr: errorMsg },
            logs: { 
              error: errorMsg,
              connectionAttempt: {
                host: host.ip,
                port: host.port || 22,
                username: host.username,
                os: host.os
              },
              fullScript: fullScript
            }
          });
          
          try {
            conn.end();
          } catch (e) {
            console.error(`[@runner:processJob] Error ending connection: ${e.message}`);
          }
        })
        .connect({
          host: host.ip,
          port: host.port || 22,
          username: host.username,
          [host.authType === 'privateKey' ? 'privateKey' : 'password']: sshKeyOrPass,
          debug: (msg) => console.log(`[@runner:sshDebug] ${msg}`),
        });
    }
  } catch (error) {
    console.error('[@runner:processJob] Error processing job:', error);
    
    // Update job run if we have an ID
    if (jobRunId) {
      await updateJobRunStatus(jobRunId, 'failed', {
        error: `Unexpected error: ${error.message || 'Unknown error'}`,
        logs: { error: error.stack || error.message || 'Unknown error' }
      });
    }
  }
}

async function setupSchedules() {
  const { data, error } = await supabase.from('jobs_configuration').select('id, config');
  if (error) {
    console.error(`Failed to fetch configs for scheduling: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) {
    console.log('No configs found for scheduling.');
    return;
  }

  data.forEach(({ id, config }) => {
    if (!config) {
      console.warn(`Config ${id} has no config data`);
      return;
    }
    const job = JSON.stringify({
      config_id: id,
      timestamp: new Date().toISOString(),
      requested_by: 'system',
    });
    if (config.schedule && config.schedule !== 'now') {
      cron.schedule(config.schedule, async () => {
        await redis.lpush('jobs_queue', job);
        console.log(`Scheduled job queued for config ${id}`);
      });
    } else if (config.schedule === 'now') {
      redis.lpush('jobs_queue', job);
      console.log(`Immediate job queued for config ${id}`);
    }
  });
}

async function logQueueStatus() {
  try {
    const queueLength = await redis.llen('jobs_queue');
    console.log(`[@runner:queueStatus] Jobs in queue: ${queueLength}`);
  } catch (error) {
    console.error('[@runner:queueStatus] Error checking queue length:', error);
  }
}

async function startProcessing() {
  console.log('[@runner:startProcessing] Starting job processing');
  
  // Process jobs at regular intervals
  setInterval(processJob, 5000);
  
  // Log queue status at regular intervals
  setInterval(logQueueStatus, 60000);
  
  // Setup scheduled jobs
  try {
    await setupSchedules();
    console.log('[@runner:startProcessing] Schedules setup complete');
  } catch (err) {
    console.error('[@runner:startProcessing] Setup schedules failed:', err);
  }
  
  console.log('[@runner:startProcessing] Worker running...');
  
  // Initial job processing on startup
  await processJob();
}

// Start processing jobs
startProcessing().catch(err => {
  console.error('[@runner:startProcessing] Failed to start job processing:', err);
});
