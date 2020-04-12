import React, { useState, useEffect, Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Button, Clipboard, Animated, Vibration, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import * as TaskManager from 'expo-task-manager';
import { getDistance } from 'geolib';
import { AsyncStorage } from 'react-native';
import uuid from 'uuid-random';
import axios from 'axios';
import { Notifications } from 'expo';
import Constants from 'expo-constants';

import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  PROVIDER_GOOGLE
} from "react-native-maps";

const LOCATION_TASK_NAME = 'background-location-task';
const API = 'https://covnet.herokuapp.com/api/infections';
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;

export default class App extends Component {
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
      crossedPaths: null,
      
      allowAccessLocation: false,
      loading: true,

      latitude: 0,
      longitude: 0,

      showMap: false

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
      this.setState({ allowAccessLocation: true })
      this.locationListener();
    }
  }

  _retrieveData = async () => {
    try {
      let uniqueId = await AsyncStorage.getItem('uniqueId');
      // uniqueId = null;

      if (uniqueId == null || uniqueId == undefined) {
        uniqueId = await this.generateUniqueId();
      }

      console.log(uniqueId);

      let value = await AsyncStorage.getItem('userLocations');
      // value = null;
      
      // this.GPSTesting('-33.855978, 150.904620');
      // this.GPSTesting('-33.855837, 150.904687');
      
      if (value != null || value != undefined) {
        let json = JSON.parse(value);

        if (json.hasOwnProperty('locations')) {
          let { locations } = json;

          this.setState({ locations, uniqueId }, () => {
            // this.GPSTesting('-33.849946, 150.902624');
            this.getInfectedLocations();
          });

        } else {
          this.setState({ uniqueId });
          this.getInfectedLocations();
        }

      } else {
        this.setState({ uniqueId });
        this.getInfectedLocations();
      }

    } catch (error) {
      console.log('err', error)
    }
  };

  GPSTesting = gps => {

    var now = new Date();
    // now.setMinutes(now.getMinutes() + 5); // timestamp
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

        let unixtimeUTC = Math.floor(timestamp);
        let unixtimeUTC_28daysAgo = unixtimeUTC - 60 * 60 * 24 * 1000 * 28;

        if (locations.length >= 1) {
          let lastSaveTime = locations[locations.length - 1]['timestamp'];
          if (lastSaveTime + this.minLocationSaveInterval > unixtimeUTC) {
            //console.log('too soon');
            return;
          }
        }

        // let curated = [];
        // for (let i = 0; i < locations.length; i++) {
        //   if (locations[i]['timestamp'] > unixtimeUTC_28daysAgo) {
        //     curated.push(locations[i]);
        //   }
        // }

        let newLocation = {
          latitude,
          longitude,
          timestamp
        };

        if (locations.length > 0) {
          let dist = getDistance(locations[locations.length-1], newLocation);
          // console.log(dist);

          if (dist > this.distanceInMeters + 20) {
            locations.push(newLocation);
            console.log('location added')

            if (this._isMounted) {
              this.setState({ locations, latitude, longitude }, () => this._storeData());
            }
          }
        } else {
          locations.push(newLocation);
          console.log('location added')

          if (this._isMounted) {
            this.setState({ locations, latitude, longitude }, () => this._storeData());
          }
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

  getMapRegion = location => ({
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });


  getInfectedLocations = async () => {
    // console.log('getInfectedLocations()')
    let { uniqueId } = this.state;
    let infectedLocations = [];

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
            // console.log('a new case found')
            infectedLocations.push(...infection.coords)
          }
        });

        if (infectedLocations.length > 0) {
          this.setState({ infectedLocations }, () => this.userHasCrossedPaths());
        } else {
          this.setState({ loading: false })
        }
      } else {
        this.setState({ loading: false })
      }
    } catch (err) {
      console.log('err', err);
      this.setState({ loading: false })
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
      
      // console.log('min:' + new Date(timeMin).toLocaleDateString() +' '+ new Date(timeMin).toLocaleTimeString());
      // console.log('max:' + new Date(timeMax).toLocaleDateString() +' '+ new Date(timeMax).toLocaleTimeString());

      // i will contain the coords of the minimum time of the window
      let i = this.binarySearchForTime(concernArray, timeMin);
      if (i < 0) i = -(i + 1);

      while (i < concernArray.length && concernArray[i].timestamp <= timeMax) {
        //console.log('infected:' + new Date(concernArray[i].timestamp).toLocaleDateString() +' '+ new Date(concernArray[i].timestamp).toLocaleTimeString());
        let dist = getDistance(location, concernArray[i]);
        // console.log('dist', dist);

        if (dist <= this.distanceInMeters) {
          console.log('Crossed path within', dist, 'meters');
          let date = this.formatDate(concernArray[i].timestamp);
          let message = 'You may have got in contact with a confirmed case ' + date;

          this.setState({ crossedPaths: { infectedLocation: concernArray[i], userLocation: location, message}, loading: false });
          return;
        }

        i++;
      }
    }
    this.setState({ loading: false })
  }

  binarySearchForTime(array, targetTime) {
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

  showId = () => {
    this.setState({ showId: true }, () => {
      setTimeout(() => {
        this.setState({ showId: false })
      }, 60000);
    });
  }

  copiedId = () => {
    const { uniqueId } = this.state;

    this.setState({ copied: true }, () => {
      Clipboard.setString(uniqueId);
      setTimeout(() => {
        this.setState({ copied: false })
      }, 3000);
    })
  }

  map = () => {
    let { infectedLocations, locations, crossedPaths, showMap } = this.state;
    let location = '';

    if (showMap == 'map') {
      location = locations[locations.length-1];
      infectedLocations.unshift(location);

    } else {
      if (crossedPaths == null) return false;
      location = crossedPaths.userLocation;
      infectedLocations = [location, crossedPaths.infectedLocation];
    }

    return (
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showUserLocation
        loadingEnabled
        region={this.getMapRegion(location)}
      >
        { infectedLocations.length > 0 ? infectedLocations.map((marker, index) => {
            const coords = {
                latitude: Number(marker.latitude),
                longitude: Number(marker.longitude)
            };

            const date = this.formatDate(marker.timestamp);
            const isMe = index === 0;

            return (
                <MapView.Marker
                    key={index}
                    pinColor={isMe ? 'blue' : showMap == 'contact' ? 'red' : 'green'}
                    coordinate={coords}
                    title={isMe && showMap == 'contact' ? 'Where I was' : isMe ? 'Where I am' : 'Infected user' }
                    description={isMe ? `Recorded ${date}` : showMap == 'contact' ? 'This is how close the confirmed case was to you' : `Closest location of confirmed case in your area`}
                />          
            );
        }) : null }
      </MapView>
    )
  }

  formatDate = timestamp => {
    let time = new Date(timestamp).toLocaleTimeString();
    time = time.substring(0, time.split(':')[0].length === 2 ? 5 : 4) + ' ' + time.split(' ')[1]

    return `at ${time} on ${new Date(timestamp).toDateString()}`;
  }

  toggleView = t => {
    this.setState({ showMap: t })
  }

  render() {
    const { uniqueId, loading, locations, crossedPaths, infectedLocations, isInfected, recentInfected, allowAccessLocation } = this.state;
    // console.log('locations', this.state.locations.length);
    return (
      <>
        <View style={styles.logoContainer}>
          <Image
            source={
              require('./assets/COVNET-w-t.png')
            }
            style={styles.logoImage}
          />
        </View>
        { loading ? (
          <View style={styles.centerContainer}>
            <Text>Loading ...</Text>
          </View>
        ) : (
          <>
            { this.state.showMap ? this.map() : (
              <>
                <View style={styles.centerContainer}>
                  { allowAccessLocation ? (
                    <>
                      <Text>Your location is being logged locally. You will be notifed if you have been in close contact with a confirmed case.</Text>
                      {/* <Text>{locations.length}</Text> */}
                    </>
                  ) : (
                    <Text>In order for the app to work, location must be turned on. Your location will not leave your phone.</Text>
                  )}

                  <View style={styles.containerTop}>
                    { isInfected ? (
                      <View>
                        <Text>You have been diagnosed with COVID-19, here's what you should do: </Text>
                        <Text> - Self-isolate, stay at home!</Text>
                        <Text> - Wear a surgical mask to reduce the risk of spreading the virus to more people</Text>
                        <Text> - Wash your hands more often</Text>
                        <Text> - Contact emergency if your symptoms become severe</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.containerTop}>
                    { crossedPaths != null ? (
                      <View>
                        <TouchableOpacity onPress={() => this.toggleView('contact')}> 
                          <Text>
                            <Text style={styles.crossedPath}>{crossedPaths.message}. Click to show location of contact with the infected user</Text>
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : locations.length > 0 && infectedLocations.length > 0 && !isInfected ? (
                      <View>
                        <Text style={styles.green}>Good news!</Text>
                        <Text>You have not been in contact with a confirmed case</Text>
                        <Text>To make sure you don't get infected, follow these points:</Text>
                        <Text> - Wash your hands!</Text>
                        <Text> - Practice social distancing</Text>
                        <Text> - Try to stay home as much as you can, only leave for work, groceries, excerice or to get medicine</Text>
                      </View>
                    ) : null }
                  </View>
                  {
                    locations.length != 0 ? (
                      <>
                        <Button style={styles.mapbtn} onPress={() => this.toggleView('map')} title={this.state.showMap ? 'Back' : 'Map'} />
                      </>
                      ) : null 
                  }
              </View>
              <View style={styles.deviceId}>
                { this.state.copied ? (
                  <FadeInView>
                    <Text style={styles.blue}>Copied!</Text>
                  </FadeInView>
                ) : null }
                { uniqueId != null ? this.state.showId ? (
                  <FadeInView>
                    <TouchableOpacity onPress={() => this.copiedId()}>
                      <Text>{uniqueId}</Text>
                    </TouchableOpacity>
                  </FadeInView>
                ) : (
                  <Button 
                    onPress={() => this.showId()}
                    title="Show ID"
                  />
                ) : null}
              </View>
            </>
          )}
        </>
        )}
      </>
    );
  }
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: 'grey'
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center"
  },
  mapbtn: {
    marginBottom: 15
  },
  list: {
    flex:1
  },
  blue: {
    color: 'blue'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25
  },
  containerTop: {
    marginTop: 15,
  },
  center: {
    alignItems: 'center'
  },
  logo: {

  },
  mbutton: {
    marginBottom: 15
  },
  green: {
    color: 'green'
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: -150,
    marginBottom: -150
  },
  logoImage: {
    width: 200,
    resizeMode: 'contain'
  },
  deviceId: {
    paddingBottom: 20,
    fontSize: 10,
    alignItems: 'center'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  crossedPath: {
    color: 'red'
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

const FadeInView = (props) => {
  const [fadeAnim] = useState(new Animated.Value(0))  // Initial value for opacity: 0

  React.useEffect(() => {
    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 1000,
      }
    ).start();
  }, [])

  return (
    <Animated.View                 // Special animatable View
      style={{
        opacity: fadeAnim         // Bind opacity to animated value
      }}
    >
      {props.children}
    </Animated.View>
  );
}
