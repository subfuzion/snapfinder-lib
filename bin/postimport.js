// Mongo script to run after importing CSV data
// (called by the import shell script)

function toTitleCase(str)
{
  // handle null input
  str = '' + str;
  return str.replace(/\w\S*/g, function(s) {
    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
  });
}

function toUpperCase(str) {
  return ('' + str).toUpperCase();
}

// adds store.localAddress property (no state or zipcode)
// and returns value
function formatLocalAddress(store) {
  var address = store.address1;
  if (store.address2) address += ', ' + store.address2;
  if (store.city) address += ', ' + toTitleCase(store.city);
  store.localAddress = address;
  return address;
}

// adds fully-formatted store.address property
// (includes state and zip5) and returns value
function formatAddress(store) {
  var address = store.localAddress || formatLocalAddress(store);
  if (store.state) address += (', ' + store.state).toUpperCase();
  if (store.zip5) address += ', ' + store.zip5;
  store.address = address;
  return address;
}

// adds latlng in format expected by google (lat,lng)
// and returns it
function formatlatlng(store) {
  var latlng = '' + store.latitude + ',' + store.longitude;
  store.latlng = latlng;
  return latlng;
}

// adds urlencode google map url for the store location
// and returns it
function formatMapUrl(store) {
  var address = store.address || formatAddress(store);
  var mapUrl = 'https://www.google.com/maps?t=m&q=' + encodeURIComponent(address);
  store.mapUrl = mapUrl;
  return mapUrl;
}

// kludge to remove the header inserted as first document
// since mongoimport won't do this if custom headers are specified
// note: could search for the document with storeName:"Store_Name"
// but this way will work if storeName is changed to something else

var id = db.stores.find().limit(1).next()._id; db.stores.remove({_id:id});

// add geo support
print('updating snapdb for geo query support...');
db.stores.find().forEach(function(store) {
  db.stores.update(
    { _id: store._id },
    { $set: {
          loc: [store.longitude, store.latitude]
        , city: toTitleCase(store.city)
        , county: toTitleCase(store.county)
        , state: toUpperCase(store.state)
        , localAddress: formatLocalAddress(store)
        , address: formatAddress(store)
        , latlng: formatlatlng(store)
        , mapUrl: formatMapUrl(store)
      }
    });
});

print('indexing...');
db.stores.ensureIndex({ "latitude": 1 });
db.stores.ensureIndex({ "longitude": 1 });
db.stores.ensureIndex({ "zip5": 1, "zip4": 1 });
db.stores.ensureIndex({ "loc": "2d" });

