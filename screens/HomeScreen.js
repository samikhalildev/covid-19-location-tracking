import * as WebBrowser from 'expo-web-browser';

import React, { useState, useEffect, Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Button, Clipboard, Animated, Vibration, Platform } from 'react-native';
import { MonoText } from '../components/StyledText';
import Config from '../constants/Config';
import isEmpty from '../helpers/isEmpty';
import { loadData, setData } from '../services/localStorage';
import { getNewCases, getInfectedLocations, sendNotification, sendInfectedLocations } from '../services/apis';
import { getUserId, findInfectedContacts, getStoredLocation } from '../helpers/general';
import MapInterface from '../components/Map';
import Loading from '../components/Loading';

export default class HomeScreen extends Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    this.state = {
      // user data
      userId: null,
      locations: [],
      isInfected: false,
      recentInfected: false,
      city: '',
      newUser: true,

      notificationToken: null,

      // corresponds to other infected locations within the area
      infectedLocations: [],
      contacts: [],
      newContact: false,
      
      loading: true,

      latitude: 0,
      longitude: 0,

      mapStatus: 'all' 
    };
  }

  componentDidMount = async () => {
    this._isMounted = true;
    await this.getId();
    await this.getCity();
    await this.runProcess();
  }

  // This will update location, get new cases and look for infected locations
  runProcess = async () => {
    if (!this.state.loading) this.setState({ loading: true })
    console.log('start')

    try {
      let vals = await getStoredLocation();

      if (!isEmpty(vals) && vals.locations && vals.locations.length) {
        let { locations, contacts } = vals;
        let numberOfContacts = Number(contacts.length)
        console.log('locations', locations.length)
        
        // update locations and contacts
        if (this._isMounted) {
          this.setState({ locations, contacts }, async () => {
            const { userId, city } = this.state;

            // get new cases
            let status = await getNewCases(userId, locations, city);

            if (status && status == 'sent') {
              console.log('sent location');
              if (this._isMounted) this.setState({ recentInfected: true, isInfected: true });
            } 

            // get infected locations
            let data = await getInfectedLocations(userId, city);
            console.log('getInfectedLocations')

            if (data != null && 'infectedLocations' in data && data.infectedLocations.length > 0) {
              let { infectedLocations, isInfected } = data;

              console.log('infected locations', infectedLocations.length)
              console.log('isInfected', isInfected)
              if (this._isMounted) this.setState({ isInfected }, async () => {
                let nearbyInfectedLocations = []

                findInfectedContacts(locations, infectedLocations, contacts, nearbyInfectedLocations);
                console.log('contacts', contacts.length)
                console.log('nearbyInfectedLocations', nearbyInfectedLocations.length)
                
                if (this._isMounted && nearbyInfectedLocations.length)
                  this.setState({ infectedLocations: nearbyInfectedLocations });

                await setData('contacts', contacts);
                if(this._isMounted) this.setState({ contacts, newContact: true });
                
                this.setOffLoading()
              })
                
            } else if (data != null && 'isInfected' in data) {
              if (this._isMounted) this.setState({ isInfected: data.isInfected, loading: false })
            } 
          })
        }
      } else {
        this.setOffLoading()
      }

    } catch (err) {
      console.log(err);
      this.setOffLoading()
    }
  }

  setOffLoading = async () => {
    if (this._isMounted) {
      this.setState({ loading: false })
      console.log('end')
    }
  }
  componentWillUnmount = async () => {
    this._isMounted = false;
  }

  getId = async () => {
    let userId = await getUserId();
    this.setState({ userId })
  }

  getCity = async () => {
    let city = await loadData('userCity');
    if (!isEmpty(city)) {
      this.setState({ city, newUser: false });
    }
  }

  render() {
    const { locations, contacts, infectedLocations, isInfected, recentInfected, loading } = this.state;
    return (
      <View style={styles.container}>
        { this.props.locationGranted && locations.length ? 
          <MapInterface mainMap={true} locations={locations} infectedLocations={infectedLocations} /> : (
          <View style={styles.vContainer}> 
            <Text style={styles.lightText}>No movement has been detected yet.</Text>
            <TouchableOpacity onPress={() => this.runProcess()}>
              <Text>{loading ? 'Loading...' : 'Click to refresh' }</Text> 
            </TouchableOpacity>
          </View>
        )}
          
        {/* Bottom Tab bar */}
        { isInfected || recentInfected || contacts.length ? (
          <View style={styles.alertContainer}>
            { isInfected || recentInfected  ? (
              <Text style={styles.alertText}> You have been confirmed with COVID-19! </Text>              
            ) : (
              <Text style={styles.alertText}>
                Based on your GPS history, it is possible you were in contact with or close to someone diagnosed with the virus.
                Click the Contacts tab to view more
              </Text>
            )}
             
            {/* 
            <View style={[styles.codeHighlightContainer, styles.navigationFilename]}>
              <MonoText style={styles.codeHighlightText}>navigation/BottomTabNavigator.js</MonoText>
            </View> */}
          </View>
        ) : null}
        <View style={[styles.refreshContainer, contacts.length ? styles.btnBottom : isInfected || recentInfected ? styles.btnBottom2 : styles.btnZero]}>
          { this.props.locationGranted && locations.length ? 
            loading ? (
              <Button style={styles.refreshBtn} title='Loading...'/> 
            ) : (
              <Button onPress={() => this.runProcess()} style={styles.refreshBtn} title='Refresh'/>
            )
          : null }
        </View>
      </View>
    );
  }
}

HomeScreen.navigationOptions = {
  header: null,
};

const styles = StyleSheet.create({
  container: {
    flex: 1
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
    textAlign: 'center',
    textAlignVertical: "center"
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
  vContainer: {
    alignItems: 'center',
    textAlign: 'center',
    flex: 1, justifyContent: 'center'
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
  refreshContainer: {
    position: 'absolute',//use absolute position to show button on top of the map
    alignSelf: 'flex-end',
    backgroundColor: 'white',
    padding: 2
  },
  btnZero: {
    bottom: 10, //for center align
  },
  btnBottom2: {
    bottom: '7%'
  },
  btnBottom: {
    bottom: '17%'
  },
  refreshBtn: {
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
    paddingVertical: 5,
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
  helpLink: {
    paddingVertical: 15,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});