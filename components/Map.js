import * as React from 'react';
import { Text, Dimensions, View, StyleSheet } from 'react-native';
import Config from '../constants/Config';
import { formatDate, getMapRegion } from '../helpers/general';
import { createStackNavigator } from '@react-navigation/stack';

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
      _infectedLocations.unshift(location);

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
        provider={PROVIDER_GOOGLE}
        loadingEnabled
        region={getMapRegion(location)}
      >
        { _infectedLocations.length > 0 ? _infectedLocations.map((marker, index) => {
            const coords = {
                latitude: Number(marker.latitude),
                longitude: Number(marker.longitude)
            };

            const date = formatDate(marker.timestamp);
            const isMe = index === 0;

            return (
                <MapView.Marker
                    key={index}
                    pinColor={isMe ? 'blue' : contact ? 'red' : 'green'}
                    coordinate={coords}
                    title={isMe && contact ? 'Where you were' : isMe ? 'My last recorded location' : 'Infected user' }
                    description={isMe ? `Recorded ${date}` : contact ? `This is where the confirmed case was ${date}` : `Closest location of confirmed case recorded ${date}`}
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