import * as React from 'react';
import { Text, Dimensions, View, StyleSheet, Platform } from 'react-native';
import Config from '../constants/Config';
import { formatDate, getMapRegion } from '../helpers/general';
import { createStackNavigator } from '@react-navigation/stack';
import { getDistance } from 'geolib';

import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  MAP_TYPES,
  PROVIDER_DEFAULT,
  ProviderPropType,
  UrlTile,
  PROVIDER_GOOGLE
} from "react-native-maps";
import isEmpty from '../helpers/isEmpty';


const MapInterface = ({ locations, infectedLocations, mainMap, route, navigation }) => {

    let location = '';
    let contact = false

    if (!mainMap) {
      if (!'contact' in route.params && Object.keys(route.params.contact).length == 0) {
        return false        
      }

      contact = route.params.contact
    }

    // // create a new instance
    let _infectedLocations = []

    if (!contact) {
      if (infectedLocations.length)
        _infectedLocations = Array.from(infectedLocations)
      location = locations[locations.length-1];
      // _infectedLocations.unshift(location);

    } else {
      if (isEmpty(contact)) return false;
      location = contact.myLocation;
      _infectedLocations = [location, contact.infectedLocation];
    }

    // showsUserLocation={!contact}

    return (
      <>
      <MapView
        style={styles.map}
        loadingEnabled
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        showsUserLocation={!contact}
        region={getMapRegion(location)}
      >
        { _infectedLocations.length > 0 ? _infectedLocations.map((marker, index) => {
            const coords = {
                latitude: Number(marker.latitude),
                longitude: Number(marker.longitude)
            };

            const date = formatDate(marker.timestamp);
            const time = date.substr(0, date.indexOf('on') - 1)
            const isMe = index === 0;

            return (
                <MapView.Marker
                    key={index}
                    pinColor={isMe && contact ? 'blue' : 'red'}
                    coordinate={coords}
                    title={isMe && contact ? 'Where you were' : contact ? 'Infected user' : `Infected location within ${getDistance(location, marker)} meters` }
                    description={contact ? `Recorded ${date}` : `Recorded ${time}, stay away from this area`}
                />          
            );
        }) : null }
      </MapView>
      </>
    )
}

const styles = {
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height
    // flex: 1,
    // ...StyleSheet.absoluteFillObject,
    // justifyContent: "flex-end",
    // alignItems: "center"
  }
}

export default MapInterface;