'use client';

import { useState, useEffect } from 'react';
import { useHost } from '@/hooks/useHost';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/shadcn/alert-dialog';
import { useRouter } from 'next/navigation';
import { Edit, Save, Trash2, ArrowLeft, RefreshCw, Server, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';

interface HostDetailProps {
  hostId: string;
  onBack?: () => void;
}

export function HostDetail({ hostId, onBack }: HostDetailProps) {
  const router = useRouter();
  const t = useTranslations('Hosts');
  const { host, loading, error, isTesting, updateHost, deleteHost, testConnection } = useHost(hostId);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'ssh' | 'docker' | 'portainer'>('ssh');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState<number | undefined>(undefined);
  const [user, setUser] = useState('');

  // Initialize form when host data is loaded
  useEffect(() => {
    if (host) {
      setName(host.name);
      setDescription(host.description || '');
      setType(host.type);
      setIp(host.ip);
      setPort(host.port);
      setUser(host.user || '');
    }
  }, [host]);

  const handleEdit = () => {
    setName(host?.name || '');
    setDescription(host?.description || '');
    setType(host?.type || 'ssh');
    setIp(host?.ip || '');
    setPort(host?.port);
    setUser(host?.user || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (await updateHost({ 
      name, 
      description, 
      type,
      ip,
      port,
      user: user || undefined
    })) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (await deleteHost()) {
      if (onBack) {
        onBack();
      } else {
        router.push('/hosts');
      }
    }
  };

  const handleTestConnection = async () => {
    await testConnection();
  };

  const getStatusBadge = () => {
    if (!host) return null;
    
    switch (host.status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Wifi className="h-3 w-3 mr-1" /> {t('connected')}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('pending')}</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><WifiOff className="h-3 w-3 mr-1" /> {t('failed')}</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-24 mr-2" />
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('error')}</CardTitle>
          <CardDescription>{t('failedToLoadHost')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error.message}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onBack || (() => router.push('/hosts'))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!host) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('hostNotFound')}</CardTitle>
          <CardDescription>{t('hostNotFoundDescription')}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onBack || (() => router.push('/hosts'))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          {isEditing ? (
            <>
              <CardTitle>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('hostName')}
                  className="text-xl font-bold"
                />
              </CardTitle>
              <CardDescription>{t('editHostDetails')}</CardDescription>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <CardTitle>{host.name}</CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription>
                {host.ip}:{host.port || '22'} • {t('lastConnected', { 
                  date: host.lastConnected 
                    ? new Date(host.lastConnected).toLocaleDateString() 
                    : t('never')
                })}
              </CardDescription>
            </>
          )}
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isTesting}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
            {t('testConnection')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <label htmlFor="description">{t('description')}</label>
              <Textarea 
                id="description"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder={t('hostDescriptionPlaceholder')}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="type">{t('connectionType')}</label>
              <Select value={type} onValueChange={(value) => setType(value as 'ssh' | 'docker' | 'portainer')}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectConnectionType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssh">SSH</SelectItem>
                  <SelectItem value="docker">Docker</SelectItem>
                  <SelectItem value="portainer">Portainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="ip">{t('ipAddress')}</label>
              <Input 
                id="ip"
                value={ip} 
                onChange={(e) => setIp(e.target.value)} 
                placeholder={t('ipAddressPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="port">{t('port')}</label>
              <Input 
                id="port"
                type="number"
                value={port?.toString() || ''} 
                onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : undefined)} 
                placeholder={t('portPlaceholder')}
              />
            </div>
            {type === 'ssh' && (
              <div className="space-y-2">
                <label htmlFor="user">{t('username')}</label>
                <Input 
                  id="user"
                  value={user} 
                  onChange={(e) => setUser(e.target.value)} 
                  placeholder={t('usernamePlaceholder')}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-medium">{t('description')}</h3>
              <p className="text-muted-foreground mt-1">
                {host.description || t('noDescription')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">{t('connectionType')}</h3>
              <div className="flex items-center mt-1">
                <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{host.type.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium">{t('connectionDetails')}</h3>
              <div className="mt-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{t('ipAddress')}:</span> {host.ip}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('port')}:</span> {host.port || '22'}
                </p>
                {host.user && (
                  <p className="text-sm">
                    <span className="font-medium">{t('username')}:</span> {host.user}
                  </p>
                )}
              </div>
            </div>
            {host.errorMessage && (
              <div>
                <h3 className="text-sm font-medium text-red-600">{t('lastError')}</h3>
                <p className="text-sm text-red-600 mt-1">
                  {host.errorMessage}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack || (() => router.push('/hosts'))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
        </Button>
        <div className="flex space-x-2">
          {isEditing ? (
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> {t('save')}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" /> {t('edit')}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteHostConfirmation')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>{t('delete')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
} 