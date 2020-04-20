# COVNET

## Inspiration
The rapid transmission of the coronavirus COVID-19 has led to a sudden lack of information of whether or not a user has been in close contact with a COVID-19 case; have they become infected with the virus or have they become a carrier for it? So we decided to make an app that tracks this kind of information anonymously.

## What it does
Covnet is an anonymously contact tracing system. It informs you if you have been in close contact with a COVID-19 case and show you where the interaction may have occurred. You can view infected locations within 100 meters from where you are and were 2 hours ago.

How does the app know who has the virus? The app uses GPS to record your location data (anonymously), all the data is stored within your device. If a person gets tested positive, they have the option to provide their unique identification number to the health authorities to let the system know that they have tested positive. Again this is anonymous, we have no idea who they were.

The system will then capture the infected user location data from the past 2 weeks to use for contact tracing. Users who were in close contact with the infected case will get notified and be able to view when and where it happened.

## How we built it
- React Native is used as the main development framework for both IOS and Android.
- Node.js is used as an API gateway to communicate between the client (mobile and web) and database.
- Mongodb Atlas is used to host and store the infected cases, cities and health authorities

## React Native installation:

1. ```cd mobile```
2. ```npm i```
3. ```expo start```
4. Download Expo client on your mobile device
5. Scan QR code
6. View app in Expo client
