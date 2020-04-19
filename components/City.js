import React, { useState, useEffect, Component } from 'react';
import { TextInput, Text, View, TouchableOpacity, Button} from 'react-native';
import isEmpty from '../helpers/isEmpty.js';

export default City = (props) => {
    const [value, onChangeText] = React.useState(props.city);

    submitCity = () => {
        if (!isEmpty(value)) {
            let city = value.substr(0,1).toLocaleUpperCase() + value.substr(1);
            props.submitCity(city);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Enter your current city such as Sydney or New York to find infected locations.</Text>
            <TextInput
                style={styles.field}
                onChangeText={text => onChangeText(text)}
                value={value}
            />
            <Button onPress={submitCity} title="Enter" />
        </View>
    );
}

const styles = {
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 25
    },
    field: {
        width: 200, 
        height: 40, 
        borderColor: 'gray', 
        borderWidth: 1,
        textAlign: 'center'
    },
    text: {
        textAlign: 'center',
        marginBottom: 5,
        fontSize: 14
    }
}