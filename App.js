import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import * as TaskManager from 'expo-task-manager';
import haversine from "haversine";
import { getDistance } from 'geolib';
import { AsyncStorage } from 'react-native';
import uuid from 'uuid-random';
import axios from 'axios';

import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  PROVIDER_GOOGLE
} from "react-native-maps";

const LOCATION_TASK_NAME = 'background-location-task';
const API = 'https://covnet-api.herokuapp.com/api/infections';
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;

export default class Component extends React.Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    this.state = {
      uniqueId: null,
      latitude: 0,
      longitude: 0,
      routeCoordinates: [],
      distanceTravelled: 0,
      prevLatLng: {},
      coordinate: new AnimatedRegion({
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0,
        longitudeDelta: 0
      })
    };
  }

  componentDidMount = async () => {
    this._isMounted = true;
    this._retrieveData();
    this.getInfectedLocations();

    // const { status } = await Location.requestPermissionsAsync();
    const { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status === 'granted') {
      this.locationListener();
    }
  }

  _retrieveData = async () => {
    try {
      this.getUniqueId();

      const value = await AsyncStorage.getItem('userState');
      if (value !== null) {
        let json = JSON.parse(value);
        if (json.hasOwnProperty('routeCoordinates') && json.hasOwnProperty('distanceTravelled')) {
          let { routeCoordinates, distanceTravelled } = json;
          this.setState({ routeCoordinates, distanceTravelled }, () => {
            // console.log('got data')
          });
        }

      } else {
        let uniqueId = this.generateUniqueId();
        console.log(uniqueId)
        this.setState({ uniqueId });
      }
    } catch (error) {
      console.log('err', error)
    }
  };

  getUniqueId = async () => {
    let uniqueId = await AsyncStorage.getItem('uniqueId');
    if (uniqueId == null) {
      uniqueId = await this.generateUniqueId();
    }

    console.log(uniqueId);
    this.setState({ uniqueId });
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
    //console.log('Saving data')
    const { routeCoordinates, distanceTravelled } = this.state;
    if (routeCoordinates.length > 0) {
      try {
        return AsyncStorage.setItem('userState', JSON.stringify({ routeCoordinates, distanceTravelled }));
      } catch (error) {
        console.log('err', error)
      }
    }
  };

  locationListener = async () => {
    await Location.watchPositionAsync({
      accuracy: Location.Accuracy.Highest,
      enableHighAccuracy: true,
      distanceInterval: 30,
      timeInterval: 5 * 60000, // 5 minute 
    }, location => this.getLocation(location));
  };

  getLocation = location => {
    if (location) {
      let {coords, timestamp} = location;

      if (coords) {
        let {latitude, longitude} = coords;
        let { coordinate, routeCoordinates, distanceTravelled } = this.state;

        const newCoordinate = {
          latitude,
          longitude
        };

        const newCoordinateWithTime = {
          latitude,
          longitude,
          timestamp
        };

        coordinate.timing(newCoordinate).start();

        let dt = getDistance({ latitude: this.state.latitude, longitude: this.state.longitude }, newCoordinate, 5);
        if (this.state.latitude != 0 && dt < 30) {
          // console.log('no movement');
          return false;
        } else {
          if (this._isMounted) {
            this.setState({
              latitude,
              longitude,
              routeCoordinates: routeCoordinates.concat([newCoordinateWithTime]),
              distanceTravelled: distanceTravelled + this.calcDistance(newCoordinate),
              prevLatLng: newCoordinate
            });
          }
          // console.log('Travelled', dt, 'meters')
        }
      }
    }
  }

  calcDistance = newLatLng => {
    const { prevLatLng } = this.state;
    return haversine(prevLatLng, newLatLng) || 0;
  };

  componentWillUnmount = async () => {
    this._isMounted = false;
    await this._storeData();
  }

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });


  // 1. check if the user is infected
  isUserInfected = async () => {
    let res = await this.callAPI('/isUserInfected');
    const { uniqueId, routeCoordinates } = this.state;
    if (res) {

      // 2. If they are, send their location to the server
      if (res.uniqueId == uniqueId) {
        this.sendInfectedLocations(uniqueId, routeCoordinates);
      }
    }
  }

  // Sends infected user location to the server
  sendInfectedLocations = async(uniqueId, coords) => {
    //let infections = await this.callAPI('POST', data, '');

    let response = await fetch(API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uniqueId,
        coords
      }),
    });

    if (response.ok) { 
      let json = await response.json();
      console.log(json);
    } else {
      console.log(response.status, response.data);
    }
  }

  getInfectedLocations = async () => {
    axios
      .get(API)
      .then(res => {
        if (res.data.success && res.data.infections && res.data.infections.length) {
          let { infections } = res.data;
          
          this.setState({ infections });
        }
      })
      .catch(err => console.log(err));
  }
  
  callAPI = async (method, data, endPoint = '') => {
    let response;

    if (method === 'GET') {
      response = await fetch(API + endPoint);
    } else if (method === 'POST') {
      response = await fetch(API + endPoint, {
        method: 'POST', 
        headers: '',
        body: { data }
      })
    }

    if (response.status === 200) { 
      return response.json();
    } else {
      console.log(response.status, response.data);
      return false;
    }
  }

  render() {
    const { uniqueId } = this.state;
    return (
      <View style={styles.container}>
        { uniqueId ? <Text>{uniqueId}</Text> : null}
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showUserLocation
          followUserLocation
          loadingEnabled
          region={this.getMapRegion()}
        >
          <Polyline coordinates={this.state.routeCoordinates} strokeWidth={5} />
          <Marker.Animated
            ref={marker => {
              this.marker = marker;
            }}
            coordinate={this.state.coordinate}
          />
        </MapView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.bubble, styles.button]}>
            <Text style={styles.bottomBarContent}>
              {parseFloat(this.state.distanceTravelled).toFixed(2)} km
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center"
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