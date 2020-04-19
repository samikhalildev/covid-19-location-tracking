import * as React from 'react';

import { Notifications } from 'expo';
import * as Permissions from 'expo-permissions';
import Config from '../constants/Config';

const getPermission = async () => {
  const { status: existingStatus } = await Permissions.getAsync(Permissions.NOTIFICATIONS);
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('To ensure you get notified when you get in contact with an infected person, notifications must be enabled')
    return false;
  }

  token = await Notifications.getExpoPushTokenAsync();
  console.log(token);

  if (Platform.OS === 'android') {
    Notifications.createChannelAndroidAsync('default', {
      name: 'default',
      sound: true,
      priority: 'max',
      vibrate: [0, 250, 250, 250],
    });
  }
  return token;
}

export default {
  getPermission
}