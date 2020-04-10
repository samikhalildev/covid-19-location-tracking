# COVNET

## Tasks:
1. Track user location
2. Store state in local device
3. Send data to server when user is infected 
  - Generate unique id for each user
  - Create a portal for health professionals to submit infected cases
  - The server will listen for new cases, the client will send the infected user location to the server
4. If another user came in contact with the case, they will be notifed
  - All users in the same city will receieve the infected case
  - If a user was in the same location (within 10 meters and within 2 hours range) of an infected cases, they will be notifed
  
# React Native installation:

1. ```cd mobile```
2. ```npm i```
3. ```expo start```
4. Download Expo client on your mobile device
5. Scan QR code
6. View app in Expo client
