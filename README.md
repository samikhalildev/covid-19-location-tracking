# COVNET

## Inspiration
The rapid transmission of the coronavirus (COVID-19) has led to a sudden lack of information of whether or not a user has crossed paths with a COVID-19 case: have they become infected with the virus or have they become a carrier for it? So we decided to make an app that tracks this kind of information anonymously.

## What it does
COVNET, informs users who have been in close contact with a COVID-19 case. The app helps health personnels trace contacts of a confirmed case and allow them to get a better idea of who is most likely to get infected.

The app will ask for permission to access the user’s location data and will track their location anonymously every 5 minutes. Each user will be assigned an ID to distinguish them from other users. If a user test positive, they have the option to send their ID to the health personnel. The health personnel will have access to a portal where they can sign in and enter the ID of the infected user to let the system know that they have tested positive. The server will receive the submissions and captures the infected user's location data for the past 2 weeks from the device. All users in the same city will receive the infected locations and if someone was in close contact with the confirmed case (between 2 hours of contact and within 30 meters) they will get notifed.

## How we built it
- React Native is used as the main development framework for both IOS and Android.
- Node.js is used as an API gateway to communicate between the client (mobile and web) and database.
- Mongodb Atlas is used to host and store the infected cases in the cloud

## Features:
1. Track user location
2. Store state in local device
3. Send data to server when user is infected 
  - Generate unique id for each user
  - Create a portal for health professionals to submit infected cases
  - The server will listen for new cases, the client will send the infected user location to the server
4. If another user was in close contact with the case, they will be notifed
  - All users in the same city will receieve the infected case
  - If a user was in the same location (within 15 meters and within 2 hours range) of an infected cases, they will be notifed

## React Native installation:

1. ```cd mobile```
2. ```npm i```
3. ```expo start```
4. Download Expo client on your mobile device
5. Scan QR code
6. View app in Expo client
