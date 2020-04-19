import { AsyncStorage } from 'react-native';

export async function loadData(key, isString = true) {
    try {
      let data = await AsyncStorage.getItem(key);
  
      if (isString) {
        return data;
      }
  
      return JSON.parse(data);
    } catch (error) {
      console.log(error.message);
    }
    return false;
  }
  
export async function setData(key, item) {
    try {
      if (typeof item !== 'string') {
        item = JSON.stringify(item);
      }
  
      return await AsyncStorage.setItem(key, item);
    } catch (error) {
      console.log(error.message);
    }
  }