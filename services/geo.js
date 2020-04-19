import * as React from 'react';

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import Config from '../constants/Config';
import { getDistance } from 'geolib';
import { loadData, setData } from './localStorage';

const locationTracker = async () => {
    const { status } = await Location.requestPermissionsAsync();
    if (status === 'granted') {
      await Location.startLocationUpdatesAsync(Config.LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: Config.locationInterval,
        distanceInterval: Config.distanceInMeters
      });
    }
    return status === 'granted'
}

// BACKGROUND LOCATION
const getlocation = async newLocations => {
  for (let location of newLocations) {
    let { coords, timestamp } = location;

    if (coords) {
      let { latitude, longitude } = coords;
      let locations = await loadData('userLocations', false);
      // locations = null;

      if (isEmpty(locations)) locations = []

      let unixtimeUTC = Math.floor(timestamp);
      let unixtimeUTC_28daysAgo = unixtimeUTC - 60 * 60 * 24 * 1000 * 28;

      if (locations.length > 0) {
        let lastSaveTime = locations[locations.length - 1].timestamp;
        if (lastSaveTime + Config.minLocationSaveInterval > unixtimeUTC) {
          // console.log('too soon')
          return;
        }
      }

      let curated = [];
      for (let i = 0; i < locations.length; i++) {
        if (locations[i].timestamp > unixtimeUTC_28daysAgo) {
          curated.push(locations[i]);
        }
      }

      let newLocation = {
        latitude,
        longitude,
        timestamp
      };

      if (curated.length > 0) {
        let lastRecordedLocation = curated[curated.length-1];

        if (getDistance(lastRecordedLocation, newLocation) >= Config.distanceInMeters) {
          curated.push(newLocation);
          console.log('location added')
          await setData('userLocations', curated)
          return true

        } else {
          console.log('close');
          return false
        }

      } else {
        curated.push(newLocation);
        console.log('f location added')
        await setData('userLocations', curated)
        return true

      }
    }
  }
}
  
TaskManager.defineTask(Config.LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        // Error occurred - check `error.message` for more details.
        console.log(error);
        return;
    }
    if (data) {
        let { locations } = data;
        if (locations.length > 0) {
          getlocation(locations);
        }
    }
});

export default {
    locationTracker
}