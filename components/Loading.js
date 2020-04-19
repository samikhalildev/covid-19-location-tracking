import * as React from 'react';
import { Text, View, Image } from 'react-native';
import Config from '../constants/Config';

const Loading = ({ startUp }) => {
    return (        
        <View style={styles.topContainer}>
            <Text style={styles.lightText}>Please wait... </Text>
            <Text style={styles.lightText}>{ startUp ? 'Setting up background tracking' : 'Fetching new location data'} </Text>
        </View>
    )
}

const styles = {
    topContainer: {
        alignItems: 'center',
        marginHorizontal: 50,
    },
    loadingText: {
        fontSize: 15,
        color: '#2e78b7'
    },
    lightText: {
        marginBottom: 20,
        color: 'rgba(0,0,0,0.4)',
        fontSize: 14,
        lineHeight: 19,
        textAlign: 'center',
    },
    msg: {
        fontSize: 13,
        color: '#1e72b1'
    }
}

export default Loading;
