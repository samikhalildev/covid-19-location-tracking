import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as React from 'react';

import TabBarIcon from '../components/TabBarIcon';
import HomeScreen from '../screens/HomeScreen';
import InfoScreen from '../screens/InfoScreen';
import ContactsScreen from '../screens/ContactsScreen';

const BottomTab = createBottomTabNavigator();
const INITIAL_ROUTE_NAME = 'Home';

export default function BottomTabNavigator(props) {
  // Set the header title on the parent stack navigator depending on the
  // currently active tab. Learn more in the documentation:
  // https://reactnavigation.org/docs/en/screen-options-resolution.html
  let { navigation, route, locationGranted } = props;
  navigation.setOptions({ headerTitle: getHeaderTitle(route) });

  return (
    <BottomTab.Navigator initialRouteName={INITIAL_ROUTE_NAME}>
      <BottomTab.Screen
        name="Info"
        options={{
          title: 'Info',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="md-information-circle" />,
        }}>
          {props => <InfoScreen {...props} locationGranted={locationGranted}
        />}
      </BottomTab.Screen> 
      
      <BottomTab.Screen
        name="Home"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="md-map" />,
        }}>
          {props => <HomeScreen {...props} locationGranted={locationGranted}
        />}
      </BottomTab.Screen>        
      
      <BottomTab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          title: 'Contacts',
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="md-contacts" />,
        }}
      />
    </BottomTab.Navigator>
  );
}

function getHeaderTitle(route) {
  const routeName = route.state?.routes[route.state.index]?.name ?? INITIAL_ROUTE_NAME;

  switch (routeName) {
    case 'Home':
      return 'Map';
    case 'Links':
      return 'Contact List';
  }
}
