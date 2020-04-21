import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RectButton, ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import { loadData, setData } from '../services/localStorage';
import Config from '../constants/Config';
import isEmpty from '../helpers/isEmpty';
import { formatDate } from '../helpers/general'

export default class ContactsScreen extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      contacts: [],
      updatedContacts: false
    }
  }

  componentDidMount() {
    this.getContacts()
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.refreshContacts && !prevState.updatedContacts) {
      this.getContacts()
    }
  }

  getContacts = async () => {
    let contacts = await loadData('contacts', false)
    if (!isEmpty(contacts)) {
      this.setState({ contacts, updatedContacts: true })
    }
  } 

  renderMap = async contact => {
    this.props.navigation.navigate('Map', { 'contact': contact })
  }

  render() {
    const { contacts } = this.state;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {
          contacts.length ? (<>
            <Text style={styles.topText}>You had close contact with the following confirmed {`case${contacts.length > 1 ? 's' : ''}`}. Click to view where it happened:</Text>
            {contacts.map((contact, index) => {
              return (
                <OptionButton
                  key={index}
                  icon='md-warning'
                  label={`Recorded ${formatDate(contact.myLocation.timestamp)}\n${contact.timeframe}`}
                  onPress={() => this.renderMap(contact)}
                />
              )
            })}
            </>
          ) : (
            <View style={styles.vContainer}> 
            <TouchableOpacity onPress={() => this.getContacts()}>
            <Text style={styles.lightText}>{`Based on available data, you haven't been near anyone reported positive for COVID-19.\nClick to reload contacts`}</Text>
            </TouchableOpacity>
            </View>
          )
        }
      </ScrollView>
    );
  }
}

function OptionButton({ icon, label, onPress, isLastOption }) {
  return (
    <RectButton style={[styles.option, isLastOption && styles.lastOption]} onPress={onPress}>
      <View style={{ flexDirection: 'row' }}>
        <View style={styles.optionIconContainer}>
          <Ionicons name={icon} size={22} color="rgba(0,0,0,0.35)" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionText}>{label}</Text>
        </View>
      </View>
    </RectButton>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25
  },
  optionIconContainer: {
    marginRight: 12  
  },
  vContainer: {
    alignItems: 'center',
    textAlign: 'center',
    flex: 1, justifyContent: 'center'
  },
  topText: {
    paddingBottom: 15
  },
  blue: {
    color: 'blue'
  },  
  option: {
    backgroundColor: '#fdfdfd',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: '#ededed',
  },
  lastOption: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
    alignSelf: 'flex-start',
    marginTop: 1,
    color: 'red'
  },
  lightText: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
    textAlignVertical: "center"
  }
});
