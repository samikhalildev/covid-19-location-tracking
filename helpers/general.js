import uuid from 'uuid-random';
import { loadData, setData } from '../services/localStorage';
import isLocationsNearby from './isNearby';
import Config from '../constants/Config';
import { generateUserId } from '../services/apis';

export const getUserId = async () => {
    let userId = await loadData('userId');

    if (!isEmpty(userId)) {
        return userId;
    }
    
    userId = await generateUserId();
    console.log(userId)

    try {
        return await setData('userId', userId);
    } catch (error) {
        console.log('err', error)
    }
}


export const getStoredLocation = async () => {
  let locations = await loadData('userLocations', false);

  if (!isEmpty(locations)) {
    let contacts = await loadData('contacts', false)

    if (isEmpty(contacts)) 
      contacts = []
    return { locations, contacts }
  }
  return {}
}

// convert to number and sort by time
export const normalizeData = arr => {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        let elem = arr[i];
        if ('timestamp' in elem && 'latitude' in elem && 'longitude' in elem) {
        result.push({
            timestamp: Number(elem.timestamp),
            latitude: Number(elem.latitude),
            longitude: Number(elem.longitude),
        });
        }
    }

    
    result.sort((a,b) => a.timestamp - b.timestamp);
    return result;
}

export const findInfectedContacts = async (locations, infectedLocations, contacts, nearbyInfectedLocations) => {

  let localArray = normalizeData(locations);
  let concernArray = normalizeData(infectedLocations);

  let withinTimeFrame = 1000 * 60 * 60 * 2; // 2 hours
  console.log('\n\n')

  for (let location of localArray) {

    // location.timestamp += withinTimeFrame /5
      let timeMin = location.timestamp - withinTimeFrame;
      let timeMax = location.timestamp + withinTimeFrame;

      console.log('timeMin', formatDate(timeMin))
      console.log('timeMax', formatDate(timeMax))

      for (let i = 0; i < concernArray.length; i++) {
        let nextIndex = i+1;
        // console.log('infected', formatDate(concernArray[i].timestamp))
        
        if (concernArray[i].timestamp <= timeMax) {
          // console.log(1)

          if (concernArray[i].timestamp >= timeMin) {
            // console.log('2-1')

            if (isLocationsNearby(concernArray[i].latitude, concernArray[i].longitude, location.latitude, location.longitude)) {
              crossedPaths(location, concernArray[i], contacts)
            } else {
              nearbyInfectedLocations.push(concernArray[i])
            }
            // console.log(concernArray[i].latitude, concernArray[i].longitude)

          } else if (nextIndex < concernArray.length && concernArray[i+1].timestamp >= timeMin) {
            // console.log('2-2')
            // console.log('end', formatDate(concernArray[i+1].timestamp))

            if (isLocationsNearby(concernArray[i].latitude, concernArray[i].longitude, location.latitude, location.longitude)) {
              crossedPaths(location, concernArray[i], contacts)

            } else {
              nearbyInfectedLocations.push(concernArray[i])
            }
            console.log(concernArray[i].latitude, concernArray[i].longitude)
          }
        }
      // console.log('---')
    }

    /*
    for (let i = 0; i < concernArray.length - 1; i++) {
        let nextIndex = i+1;
        
        // if the infected location is within timeMin and timeMax and location is nearby, user has been in the infected location
        if (concernArray[i].timestamp <= timeMax && concernArray[i].timestamp >= timeMin || nextIndex < concernArray.length && concernArray[i+1].timestamp >= timeMin) {
          
          if (isLocationsNearby(concernArray[i].latitude, concernArray[i].longitude, location.latitude, location.longitude)) {
            console.log('infected', formatDate(concernArray[i].timestamp))
            crossedPaths(location, concernArray[i], contacts)
          } else {
            // nearbyInfectedLocations.push(concernArray[i])
          }
        }
      }
      */
  }
}

const crossedPaths = (myLocation, infectedLocation, contacts) => {
    if (contacts.some(item => item.myLocation.timestamp == myLocation.timestamp && item.infectedLocation.latitude == infectedLocation.latitude && item.infectedLocation.longitude == infectedLocation.longitude)) {
      console.log('already contact with this person');
      return false;
    }

    let data = { 
      myLocation, 
      infectedLocation,
      recent: true 
    }

    contacts.unshift(data);
    console.log('in contact');
    return contacts
}

const binarySearchForTime = (array, targetTime) => {
  var i = 0;
  var n = array.length - 1;

  while (i <= n) {
    var k = (n + i) >> 1;
    var cmp = targetTime - array[k].timestamp;

    if (cmp > 0) {
      i = k - 1;
    } else if (cmp < 0) {
      n = k + 1;
    } else {
      // Found exact match!
      // NOTE: Could be one of several if array has duplicates
      return k;
    }
  }
  return -i - 1;
}

export const formatDate = timestamp => {
    let time = new Date(timestamp).toLocaleTimeString();
    time = time.substring(0, time.split(':')[0].length === 2 ? 5 : 4) + ' ' + time.split(' ')[1]

    return `at ${time} on ${new Date(timestamp).toDateString()}`;
}


export const getMapRegion = location => ({
  latitude: Number(location.latitude),
  longitude: Number(location.longitude),
  latitudeDelta: Config.LATITUDE_DELTA,
  longitudeDelta: Config.LONGITUDE_DELTA
});