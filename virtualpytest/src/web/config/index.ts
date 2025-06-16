import androidMobileRemote from './android_mobile_remote.json';
import androidTVRemote from './android_tv_remote.json';
import bluetoothRemote from './bluetooth_remote.json';
import infraredRemote from './infrared_remote.json';

// Export all remote configurations from a single place
export { androidTVRemote, infraredRemote, bluetoothRemote, androidMobileRemote };

// Default export for backward compatibility
export default {
  androidTV: androidTVRemote,
  infrared: infraredRemote,
  bluetooth: bluetoothRemote,
  androidMobile: androidMobileRemote,
};
