# covid-19-location-tracking

## TODO:
1. Track user location ✅
2. Store state in local device ✅
3. send data to server when user is infected
  - generate unique id for each user ✅
  - create a web form to send infected user id to server
  - server will listen for ids sent and all notify clients ✅
  - if a user was found, the client will send their past 2 weeks locations data to the server
  - store data 
4. if another user came in contact with the case, they will be notifed
  - all users will receieve infected cases
  - if an infected case was in the same location and at the same as the infected cases, they will be notifed

# React Native installation:

1. ```cd mobile```
2. ```npm i```
3. ```expo start```
4. Download Expo client on your mobile device
5. Scan QR code
6. View app in Expo client
