import * as WebBrowser from 'expo-web-browser';

import React, { useState, useEffect, Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Button, Clipboard, Animated, Vibration, Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { MonoText } from '../components/StyledText';
import * as Permissions from 'expo-permissions';

import * as TaskManager from 'expo-task-manager';
import { getDistance } from 'geolib';

import geo from '../services/geo';
import notifications from '../services/notifications';
import Config from '../constants/Config';
import isEmpty from '../helpers/isEmpty';

import { Notifications } from 'expo';
import { loadData, setData } from '../services/localStorage';
import { getNewCases, getInfectedLocations, sendNotification, sendInfectedLocations } from '../services/apis';
import { getUniqueId, findInfectedContacts } from '../helpers/general';

import MapInterface from '../components/Map';
import Loading from '../components/Loading';
import City from '../components/City';

export default class InfoScreen extends Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    this.state = {
      uniqueId: null,
      city: '',
      newUser: true,
      citySubmitted: false,
      notificationToken: null,
      loading: true
    };

  }

  componentDidMount = async () => {
    this._isMounted = true;
    await this.startUp();
  }

  startUp = async () => {
    await this.getId();
    await this.getCity();
    //this.setUpNotifications;
    this.setState({ loading: false });
  }


  setUpNotifications = async () => {
    let token = await notifications.getPermission()
    console.log('token', token)
    if (token) {
      this.setState({ notificationToken: token });
      await sendNotification(token, 'You have crossed paths with an infected user', 'You');
    }
  }

  componentWillUnmount = async () => {
    this._isMounted = false;
  }

  // UI state updates

  getId = async () => {
    let uniqueId = await getUniqueId();
    this.setState({ uniqueId })
  }

  getCity = async () => {
    let city = await loadData('userCity');
    if (!isEmpty(city)) {
      this.setState({ city, newUser: false });
    }
  }

  submitCity = async city => {
    await setData('userCity', city);
    this.setState({ city, newUser: false, citySubmitted: true }, () => setTimeout(() => this.setState({ citySubmitted: false }), 2000))
  }

  showId = () => {
    if (this._isMounted) {
      this.setState({ showId: true }, () => {
        setTimeout(() => {
          this.setState({ showId: false })
        }, 20000);
      });
    }
  }

  copiedId = () => {
    const { uniqueId } = this.state;

    this.setState({ copied: true }, () => {
      Clipboard.setString(uniqueId);
    })
  }

  toggleView = () => {
    this.setState({ mapStatus: this.state.mapStatus == 'all' ? 'contact' : 'all' })
  }

  render() {
    const { uniqueId, showId, newUser, copied, city, loading, citySubmitted } = this.state;
    const { locationGranted } = this.props;
    
    // console.log('locations', locations.length)

    return (
      <View style={styles.container}>
        {/* Scroll Content */}
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Logo />
          { loading ? <Loading startUp={false} /> : (
            <>
              <TopContainer locationGranted={locationGranted} />
              { newUser ? <City city={city} submitCity={this.submitCity} /> : citySubmitted ? <View style={styles.helpContainer} ><Text style={styles.text}>Location received.</Text></View> : (
              locationGranted ? ( <View style={styles.bottomContainer}>
                  {showId ? (
                    <TouchableOpacity onPress={() => this.copiedId()}>
                      <Text style={styles.lightTextNoMargin}>{copied ? 'Copied' : 'Click to copy'}</Text>
                      <Text style={styles.lightText}>{uniqueId}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Button 
                      onPress={() => this.showId()}
                      style={styles.btn}
                      title="Show my ID"
                    />
                  )}
                </View>
              ) : null 
              ) }
            </>
          ) }
        </ScrollView>
      </View>
    );
  }
}

InfoScreen.navigationOptions = {
  header: null,
};

function Logo() {
  return (
    <View style={styles.logoContainer}>
      <Image
        source={require('../assets/images/covnet.png')}
        style={styles.welcomeImage}
      />
    </View>
  )
}

function TopContainer({ locationGranted }) {
  return (
    <View style={styles.topContainer}>
      <LocationGrantedText locationGranted={locationGranted} />
    </View>
  )
}

function LocationGrantedText({ locationGranted }) {
  return (
    <Text style={styles.lightText}>
      { locationGranted ? 'Your location is being logged locally. You will be notifed if you have been in close contact with a COVID-19 case.'
      : 'In order for the app to work, location must be turned on. Your location will not leave your phone.'} 
    </Text>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfc',
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  text: {
    textAlign: 'center',
    marginBottom: 5,
    fontSize: 14
  },
  lightText: {
    marginBottom: 20,
    color: 'rgba(0,0,0,0.4)',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
  },
  lightTextNoMargin: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
  },
  btn: {
    fontSize: 12
  },
  contentContainer: {
    paddingTop: 15,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  welcomeImage: {
    width: 200,
    height: 80
  },
  topContainer: {
    alignItems: 'center',
    marginHorizontal: 50,
  },
  homeScreenFilename: {
    marginVertical: 7,
  },
  underline: {
    textDecorationLine: 'underline'
  },
  codeHighlightText: {
    color: 'rgba(96,100,109, 0.8)',
  },
  codeHighlightContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  getStartedText: {
    fontSize: 17,
    color: 'rgba(96,100,109, 1)',
    lineHeight: 24,
    textAlign: 'center',
  },
  alertContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 20,
      },
    }),
    alignItems: 'center',
    backgroundColor: '#bf000c',
    paddingVertical: 20,
  },
  alertText: {
    fontSize: 17,
    color: '#fcfcfc',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10
  },
  navigationFilename: {
    marginTop: 5,
  },
  helpContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  bottomContainer: {
    alignItems: 'center',
    textAlign: 'center',
  },
  helpLink: {
    paddingVertical: 15,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});