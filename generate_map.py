import ssl
import certifi
import glob
import json
from geopy.geocoders import Nominatim

# Configure SSL context using certifi
ctx = ssl.create_default_context(cafile=certifi.where())
geocoder = Nominatim(user_agent="academicpages", ssl_context=ctx)

g = glob.glob("_talks/*.md")
location_dict = {}

for file in g:
    with open(file, 'r') as f:
        lines = f.read()
        if 'location: "' in lines:
            loc_start = lines.find('location: "') + 11
            loc_end = lines.find('"', loc_start)
            location = lines[loc_start:loc_end]
            if location:
                geo_location = geocoder.geocode(location)
                if geo_location:
                    location_dict[location] = [geo_location.latitude, geo_location.longitude]
                    print(location, "\n", geo_location)

# Save the location data to a JSON file
with open("talkmap/locations.json", "w") as json_file:
    json.dump(location_dict, json_file, indent=4)
