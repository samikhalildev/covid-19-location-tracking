import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import * as TaskManager from 'expo-task-manager';
import { getDistance } from 'geolib';
import { AsyncStorage } from 'react-native';
import uuid from 'uuid-random';
import axios from 'axios';

const LOCATION_TASK_NAME = 'background-location-task';
const API = 'https://covnet-api.herokuapp.com/api/infections';
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;

export default class Component extends React.Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    this.state = {
      // user data
      uniqueId: null,
      locations: [],
      isInfected: false,
      recentInfected: false,

      // corresponds to other infected locations within the area
      infectedLocations: [],
      crossedPaths: null

      // latitude: 0,
      // longitude: 0,
      // distanceTravelled: 0,
      // prevLatLng: {},
      // coordinate: new AnimatedRegion({
      //   latitude: 0,
      //   longitude: 0,
      //   latitudeDelta: 0,
      //   longitudeDelta: 0
      // })
    };

     // The desired location interval, and the minimum acceptable interval
     this.locationInterval = 60000 * 5; // Time (in milliseconds) between location information polls 5 minutes
     this.distanceInMeters = 30;
     // minLocationSaveInterval should be shorter than the locationInterval (to avoid strange skips)
     this.minLocationSaveInterval = 60000 * 4; // Minimum time between location information saves. 4 minute
    
     // Maximum time that we will backfill for missing data
     this.maxBackfillTime = 60000 * 60 * 8 // Time (in milliseconds).  60000 * 60 * 8 = 8 hours
  }

  componentDidMount = async () => {
    this._isMounted = true;
    this._retrieveData();

    // const { status } = await Location.requestPermissionsAsync();
    const { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status === 'granted') {
      // this.locationListener();
    }
  }

  _retrieveData = async () => {
    try {
      let uniqueId = await AsyncStorage.getItem('uniqueId');

      if (uniqueId == null || uniqueId == undefined) {
        uniqueId = await this.generateUniqueId();
      }

      console.log(uniqueId);

      let value = await AsyncStorage.getItem('userLocations');
      
      if (value != null || value != undefined) {
        let json = JSON.parse(value);

        if (json.hasOwnProperty('locations')) {
          let { locations } = json;

          this.setState({ locations, uniqueId }, () => {
            console.log('adding to state')
            this.GPSTesting('-33.849083, 150.906686');
            this.getInfectedLocations();
          });

        } else {
          this.setState({ uniqueId });
        }

      } else {
        this.setState({ uniqueId });
      }

    } catch (error) {
      console.log('err', error)
    }
  };

  GPSTesting = gps => {
    // console.log('gps testing')

    var now = new Date();
    now.setMinutes(now.getMinutes() + 19); // timestamp

    let location = {
      timestamp: Date.parse(now),
      coords: {
        latitude: gps.split(', ')[0],
        longitude: gps.split(', ')[1]
      }
    }
    this.getLocation(location);
  }

  generateUniqueId = () => {
    let uniqueId = uuid();
    this.setState({ uniqueId });
    console.log('generating unique id');

    try {
      return AsyncStorage.setItem('uniqueId', uniqueId);
    } catch (error) {
      console.log('err', error)
    }
  }
  
  _storeData = async () => {
    const { locations } = this.state;
    if (locations.length > 0) {
      try {
        return AsyncStorage.setItem('userLocations', JSON.stringify({ locations }));
      } catch (error) {
        console.log('err', error)
      }
    }
  };

  locationListener = async () => {
    await Location.watchPositionAsync({
      accuracy: Location.Accuracy.Highest,
      enableHighAccuracy: true,
      distanceInterval: this.distanceInMeters,
      timeInterval: this.locationInterval
    }, location => this.getLocation(location));
  };

  getLocation = location => {
    if (location) {
      let {coords, timestamp} = location;

      if (coords) {
        let {latitude, longitude} = coords;
        let { locations } = this.state;

        // Credit to safepaths MIT
        let unixtimeUTC = Math.floor(timestamp);
        let unixtimeUTC_28daysAgo = unixtimeUTC - 60 * 60 * 24 * 1000 * 28;

        if (locations.length >= 1) {
          let lastSaveTime = locations[locations.length - 1]['timestamp'];
          if (lastSaveTime + this.minLocationSaveInterval > unixtimeUTC) {
            //console.log('too soon');
            return;
          }
        }

        let curated = [];
        for (let i = 0; i < locations.length; i++) {
          if (locations[i]['timestamp'] > unixtimeUTC_28daysAgo) {
            curated.push(locations[i]);
          }
        }

        let lat_lon_time = {
          latitude,
          longitude,
          timestamp: unixtimeUTC
        };

        curated.push(lat_lon_time);
        //console.log('new location')

        if (this._isMounted) {
          this.setState({ locations: curated }, () => this._storeData());
        }
      }
    }
  }

  // Credit to safepaths MIT
  normalizeData(arr) {
    // This fixes several issues that I found in different input data:
    //   * Values stored as strings instead of numbers
    //   * Extra info in the input
    //   * Improperly sorted data (can happen after an Import)
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
  
    result.sort();
    return result;
  }

  componentWillUnmount = async () => {
    this._isMounted = false;
  }

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });


  getInfectedLocations = async () => {
    console.log('getInfectedLocations()')
    let { uniqueId } = this.state;
    let infectedLocations = [];

    console.log('calling api')
    let res = await axios.get(API);

    try {
      if (res.data.success && res.data.infections && res.data.infections.length > 0) {
        let { infections } = res.data;

        await infections.map(async (infection) => {
          // send user location data if a user has been infected
          if (infection.uniqueId == uniqueId) {

            // if location hasnt been added, add it
            if (infection.coords.length === 0) {
              this.isUserInfected(infection);

            } else {
              this.setState({ isInfected: true });
            }

          } else if (infection.coords.length > 0) {
            console.log('a new case found')
            infectedLocations.push(...infection.coords)
          }
        });

        if (infectedLocations.length > 0) {
          this.setState({ infectedLocations }, () => this.userHasCrossedPaths());
        }
      }
    } catch (err) {
      console.log('err', err);
    }
  }

  // Check if the user is infected
  isUserInfected = async () => {
    console.log('user is infected');
    await this.sendUserInfectedLocations();

    //TODO notify user that they are infected and display helpful info
  }

  // Send infected user location to the server
  sendUserInfectedLocations = async () => {
    const { uniqueId, locations } = this.state;
    
    const data = {
      uniqueId,
      coords: locations
    }
    
    const options = {
      headers: {
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin": "*",
      }
    };

    let res = await axios.post(API, data, options)

    try {
      if (res.data.success) {
        console.log('Location sent successfully')
        this.setState({ isInfected: true, recentInfected: true });
      }
    } catch (err) {
      console.log('Location failed to send', err);
    }
  }

  // This will check if a user has crossed path with a confirmed case of COVID-19
  userHasCrossedPaths = () => {
    const { infectedLocations, locations } = this.state;

    let localArray = this.normalizeData(locations);
    let concernArray = this.normalizeData(infectedLocations);

    let withinTimeFrame = 1000 * 60 * 60 * 2; // 2 hours

    for (let location of localArray) {
      // var t = new Date(location.timestamp);
      // t.setHours(t.getHours() - 1); // 2 hours agos
      // console.log(t)
      // location.timestamp = Date.parse(t);

      let timeMin = location.timestamp - withinTimeFrame;
      let timeMax = location.timestamp + withinTimeFrame;
      // console.log(new Date(timeMin).toLocaleDateString() +' '+ new Date(timeMin).toLocaleTimeString());

      // i will contain the coords of the minimum time of the window
      let i = this.binarySearchForTime(concernArray, timeMin);
      if (i < 0) i = -(i + 1);

      while (i < concernArray.length && concernArray[i].timestamp <= timeMax) {
        // console.log(new Date(concernArray[i].timestamp).toLocaleDateString() +' '+ new Date(concernArray[i].timestamp).toLocaleTimeString());
        let dist = getDistance(location, concernArray[i]);
        if (dist <= 30) {
          console.log('Crossed path within', dist, 'meters');
          this.setState({ crossedPaths: dist });
          return;
        }
        i++;
      }
    }
  }

  MIT_CrossPath = (locations, infectedLocations) => {

    // Sort the concernLocationArray
    let localArray = this.normalizeData(locations);
    let concernArray = this.normalizeData(infectedLocations);

    let concernTimeWindow = 1000 * 60 * 60 * 2; // +/- 2 hours window
    let concernDistWindow = 30; // distance of concern, in feet

    // At 38 degrees North latitude:
    let ftPerLat = 364000; // 1 deg lat equals 364,000 ft
    let ftPerLon = 288200; // 1 deg of longitude equals 288,200 ft

    var nowUTC = new Date().toISOString();
    var timeNow = Date.parse(nowUTC);

    // Save a little CPU, no need to do sqrt()
    let concernDistWindowSq = concernDistWindow * concernDistWindow;
    
    // Both locationArray and concernLocationArray should be in the
    // format [ { "time": 123, "latitude": 12.34, "longitude": 34.56 }]
    for (let loc of localArray) {

      let timeMin = loc.timestamp - concernTimeWindow;
      let timeMax = loc.timestamp + concernTimeWindow;

      let i = this.binarySearchForTime(concernArray, timeMin);
      if (i < 0) i = -(i + 1);

      while (i < concernArray.length && concernArray[i].timestamp <= timeMax) {
        // Perform a simple Euclidian distance test
        let deltaLat = (concernArray[i].latitude - loc.latitude) * ftPerLat;
        let deltaLon = (concernArray[i].longitude - loc.longitude) * ftPerLon;
        // TODO: Scale ftPer factors based on lat to reduce projection error

        let distSq = deltaLat * deltaLat + deltaLon * deltaLon;
        if (distSq < concernDistWindowSq) {
          // Crossed path.  Bin the count of encounters by days from today.
          let longAgo = timeNow - loc.timestamp;
          let daysAgo = Math.round(longAgo / (1000 * 60 * 60 * 24));

          dayBin[daysAgo] += 1;
        }

        i++;
      }
    }

    // TODO: Show in the UI!
    console.log('Crossing results: ', dayBin);
  }


  binarySearchForTime(array, targetTime) {
    // Binary search:
    //   array = sorted array
    //   target = search target
    // Returns:
    //   value >= 0,   index of found item
    //   value < 0,    i where -(i+1) is the insertion point
    var i = 0;
    var n = array.length - 1;

    while (i <= n) {
      var k = (n + i) >> 1;
      var cmp = targetTime - array[k].time;

      if (cmp > 0) {
        i = k + 1;
      } else if (cmp < 0) {
        n = k - 1;
      } else {
        // Found exact match!
        // NOTE: Could be one of several if array has duplicates
        return k;
      }
    }
    return -i - 1;
  }

  render() {
    const { uniqueId, locations, crossedPaths, infectedLocations, isInfected, recentInfected } = this.state;
    console.log('render()', this.state);

    return (
      <>
        <View style={styles.centerContainer}>
          <Text>Your location is being logged locally in your device. You will be notifed if you have been in close contact with a confirmed case of COVID-19.</Text>

          { recentInfected ? (
            <View>
              <Text>Thank you for trusting us!</Text>
              <Text>Your location is being tracked anonymously to inform other nearby users who may be at risk.</Text>
            </View>
          ) : isInfected ? (
            <View>
              <Text>Check out these helpful info to help you through your time</Text>
            </View>
          ) : (
            <View>
              {/* <Text>{locations.length} location coordinates</Text> */}
            </View>
          )}

          { crossedPaths != null ? (
            <View>
              <Text>You have crossed path with a confirmed cases within {crossedPaths} meters distance </Text>
            </View>
          ) : locations.length > 0 && infectedLocations.length > 0 && !isInfected ? (
            <View>
              <Text>Good news!</Text>
              <Text>You have not crossed paths with a confirmed case</Text>
              <Text>Check out these helpful info to stay health</Text>
            </View>
          ) : null }
        </View>

        <View style={styles.deviceId}>
          { uniqueId ? <Text>Device ID: {uniqueId}</Text> : null}
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center"
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  deviceId: {
    paddingBottom: 20,
    fontSize: 10,
    alignItems: 'center'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  bubble: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20
  },
  latlng: {
    width: 200,
    alignItems: "stretch"
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: "center",
    marginHorizontal: 10
  },
  buttonContainer: {
    flexDirection: "row",
    marginVertical: 20,
    backgroundColor: "transparent"
  }
});


TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    // Error occurred - check `error.message` for more details.
    return;
  }
  if (data) {
    const { locations } = data;
    console.log('locations', locations);
    alert(JSON.stringify(locations));
    // do something with the locations captured in the background
  }
});


/*

<MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showUserLocation
          followUserLocation
          loadingEnabled
          region={this.getMapRegion()}
        >
          <Polyline coordinates={this.state.locations} strokeWidth={5} />
          <Marker.Animated
            ref={marker => {
              this.marker = marker;
            }}
            coordinate={this.state.coordinate}
          />
        </MapView>

        */