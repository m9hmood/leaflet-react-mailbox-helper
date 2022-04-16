# Leaflet Maps with React

This app try to help Mailman to collect all the mailboxes he can collect in his way.

## Check the App online

[Click Here](https://mailman-helper.surge.sh/)    

## Run App on local

run `npm install` to install all the dependencies then run `npm start` to start the app.


## How to use
**Click** on the marker icon in the top-left corner to start drawing your path.
after you draw your path, you will side a menu to calculate and change the buffer distance.

## App Features
- Each mailbox is a marker on the map.
- When you click on a marker, you will see the mailbox's details.
- You can draw your own route on the map.
- Each marker in your route is a stop point.
- Mailboxes will be calculated based on your route and distance.
- You can remove stop points from your route by clicking on it.
- You can add stop points to your route without redrawing your path.
- Start point and end point have a different icon than stop point in your route.
- App will calculate the distance between stop point and mailbox in meters.
- you can change the buffer distance to calculate the mailboxes near the stop point easily from the settings.
- if in any case the stop points will have shared mailboxes, the app will show only one in the list.
