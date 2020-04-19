import axios from 'axios';
import Config from '../constants/Config'

// Get a list of newly infected users and check if the current user is a new infected user
export const getNewCases = async (currUser, locations, city) => {
    let res = await axios.get(Config.API + '/casesWithoutCoords')
    try {
      if (res.data && res.data.success && res.data.infections && res.data.infections.length) {
        for (let infection of res.data.infections) {
          if (infection.uniqueId == currUser) {
              return sendInfectedLocations(currUser, locations, city);
          }
        }
      }
    } catch (err) {
      console.log(err)
    }
}

// send location of infected user to notify others nearby
export const sendInfectedLocations = async (currUser, locations, city) => {
    const data = {
        uniqueId: currUser,
        city,
        coords: locations,
    }

    const options = {
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
        }
    };

    let res = await axios.post(Config.API, data, options)

    try {
        if (res.data.success) {
            return 'sent';
        }
        return false;
    } catch (err) {
        console.log('Location failed to send', err);
        return false;
    }
}

// Get all infected locations to see if a user was nearby
export const getInfectedLocations = async (uniqueId, city) => {
    let infectedLocations = [];
    let isInfected = false;
    let res = await axios.get(Config.API + `/${city}`);
    
    try {
      if (res && res.data && res.data.success && res.data.infections && res.data.infections.length > 0) {
        let { infections } = res.data;

        await infections.map(async (infection) => {
          // send user location data if a user has been infected
          if (infection.uniqueId == uniqueId) {
            isInfected = true;

          } else if (infection.coords.length > 0) {
            infectedLocations.push(...infection.coords) // TODO!
          }
        });

        return { infectedLocations, isInfected }
      }
        
    } catch (err) {
      console.log('err', err);
      this.setState({ loading: false })
    }
}

export const sendNotification = async (to, title, body) => {

  const data = JSON.stringify({                 
    to,                        
    title,                  
    body,             
    priority: "high",            
    sound: "default",              
    channelId: "default",   
  })

  const options = {
      headers: {
        Accept: 'application/json',  
        'Content-Type': 'application/json', 
        'accept-encoding': 'gzip, deflate',   
        'host': 'exp.host' 
      }
  };

  axios.post('https://exp.host/--/api/v2/push/send', data, options)
    .then(res => console.log(res))
    .catch(err => console.log(err)) 
}
