# COVNET

## Inspiration
The rapid transmission of the coronavirus (COVID-19) has led to a sudden lack of information of whether or not a user has been in close contact with a COVID-19 case; have they become infected with the virus or have they become a carrier for it? So we decided to make an app that tracks this kind of information anonymously.

## What it does
Covnet is an anonymously virus tracking app. It informs you if you have been in close contact with another user who have been diagnosed with the virus to help you get tested early and self-isolate to avoid further spread. It is also aimed to help health authorities trace contacts of a confirmed case.

How does the app know who has the virus? The app uses GPS to record your location data (anonymously), all the data is stored within your device. If a person gets tested positive, they have the option to provide their unique identification number to the health authorities to let the system know that they have tested positive. Again this is anonymous, we have no idea who you were. 

The system captures your location data from the past 2 weeks for contact tracing. Nearby users who had been in close contact with the confirmed case (between 2 hours of contact and within 15 meters) will get notifed and be able to view when and where it happened.

## How we built it
- React Native is used as the main development framework for both IOS and Android.
- Node.js is used as an API gateway to communicate between the client (mobile and web) and database.
- Mongodb Atlas is used to host and store the infected cases in the cloud

## React Native installation:

1. ```cd mobile```
2. ```npm i```
3. ```expo start```
4. Download Expo client on your mobile device
5. Scan QR code
6. View app in Expo client
