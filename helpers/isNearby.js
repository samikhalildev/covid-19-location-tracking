const isLocationsNearby = (lat1, lon1, lat2, lon2) => {
    let nearbyDistance = 20; // in meters, anything closer is "nearby"
  
    // these numbers from https://en.wikipedia.org/wiki/Decimal_degrees
    let notNearbyInLatitude = 0.00017966; // = nearbyDistance / 111320
    let notNearbyInLongitude_23Lat = 0.00019518; // = nearbyDistance / 102470
    let notNearbyInLongitude_45Lat = 0.0002541; // = nearbyDistance / 78710
    let notNearbyInLongitude_67Lat = 0.00045981; // = nearbyDistance / 43496
  
    let deltaLon = lon2 - lon1;
  
    // Initial checks we can do quickly.  The idea is to filter out any cases where the
    //   difference in latitude or the difference in longitude must be larger than the
    //   nearby distance, since this can be calculated trivially.
    if (Math.abs(lat2 - lat1) > notNearbyInLatitude) return false;
    if (Math.abs(lat1) < 23) {
      if (Math.abs(deltaLon) > notNearbyInLongitude_23Lat) return false;
    } else if (Math.abs(lat1) < 45) {
      if (Math.abs(deltaLon) > notNearbyInLongitude_45Lat) return false;
    } else if (Math.abs(lat1) < 67) {
      if (Math.abs(deltaLon) > notNearbyInLongitude_67Lat) return false;
    }
  
    // Close enough to do a detailed calculation.  Using the the Spherical Law of Cosines method.
    //    https://www.movable-type.co.uk/scripts/latlong.html
    //    https://en.wikipedia.org/wiki/Spherical_law_of_cosines
    //
    // Calculates the distance in meters
    let p1 = (lat1 * Math.PI) / 180;
    let p2 = (lat2 * Math.PI) / 180;
    let deltaLambda = (deltaLon * Math.PI) / 180;
    let R = 6371e3; // gives d in metres
    let d =
      Math.acos(
        Math.sin(p1) * Math.sin(p2) +
          Math.cos(p1) * Math.cos(p2) * Math.cos(deltaLambda),
      ) * R;
  
    // closer than the "nearby" distance?
    if (d < nearbyDistance) return true;
  
    // nope
    return false;
  }

  export default isLocationsNearby;