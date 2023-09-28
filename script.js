let inside = 0;
let outside = 0;
document.addEventListener("DOMContentLoaded", function () {
    // Initialize the map

    const map = L.map("map").setView([51.505, -0.09], 13); // Initial view coordinates

    // Create a tile layer for the map
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize the routing control
    const control = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true
    }).addTo(map);








    let polygonPoints = [];
    let reqpolygon = null;
    let removePolygon = null;
    let removePolygon_points=[];
    let markers = [];

    // Event handler for the map click
    map.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        console.log(lat, lng);
        polygonPoints.push([lat, lng]);

        // Add a marker at the clicked location (optional)
        const marker=L.marker([lat, lng]).addTo(map);
        markers.push(marker);
    });

    // Event handler for the "Create Polygon" button click
    document.getElementById('createPolygonButton').addEventListener('click', function () {
        if (polygonPoints.length >= 3) {
            // Convert your points to Leaflet LatLng objects
            const latLngPoints = polygonPoints.map(point => L.latLng(point[0], point[1]));
           
            // Create a Leaflet polygon
            const polygon = L.polygon(latLngPoints);
            reqpolygon = polygon;
            console.log("polygon");
            console.log(polygon);
            removePolygon = polygon;
            // Add the polygon to the map
            polygon.addTo(map);

            // Clear the polygonPoints array
            removePolygon_points=polygonPoints;
           
            polygonPoints = [];
        } else {
            alert('Please select at least three points to create a polygon.');
        }
    });

    document.getElementById('removePolygonButton').addEventListener('click', function () {
        if (reqpolygon) {
            map.removeLayer(reqpolygon); // Remove the polygon from the map
            console.log("Polygon removed");
            console.log(removePolygon_points);
            console.log("polygo removed points")

            markers.forEach(marker => {
                map.removeLayer(marker);
            });
            markers = [];
            reqpolygon = null;  // Set the polygon variable to null
            removePolygon_points=[];
        }
    });






    // Handle form submission
    const form = document.getElementById("routing-form");
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const startAddress = document.getElementById("start").value;
        const destinationAddress = document.getElementById("destination").value;
        // Convert start address to coordinates
        const startCoordinates = await geocodeAddress(startAddress);
        // Convert destination address to coordinates
        const destinationCoordinates = await geocodeAddress(destinationAddress);
        // Add waypoints to the routing control using the coordinates
        control.setWaypoints([
            L.Routing.waypoint(startCoordinates, startAddress),
            L.Routing.waypoint(destinationCoordinates, destinationAddress)
        ]);


        control.on("routesfound", function (e) {
            const route = e.routes[0];
            console.log(route);
            if (reqpolygon == null) {
                alert("FIRST MARK POLYGON");
            }

            else if (route) {
                const intersects = checkRouteIntersection(route, reqpolygon);
                if (intersects) {
                    alert(`Route intersects with the polygon with  ${inside} points inside`);
                } else {
                    alert('Route does not intersect with the polygon.');
                }
            }
        });

        // Display the coordinates
        document.getElementById("coordinates").innerHTML = `
            Start Coordinates: ${startCoordinates.lat}, ${startCoordinates.lng}<br>
            Destination Coordinates: ${destinationCoordinates.lat}, ${destinationCoordinates.lng}
        `;
    });

    // Function to geocode an address to coordinates using OpenStreetMap Nominatim API
    async function geocodeAddress(address) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`);
        const data = await response.json();
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        } else {
            alert("Address not found. Please check your input.");
            return null;
        }
    }

    function checkRouteIntersection(route, polygon) {
        const routeCoordinates = route.coordinates;

        // Convert the route coordinates to a GeoJSON LineString
        const routeLineString = turf.lineString(routeCoordinates);
        console.log(routeLineString);

        // Convert the Leaflet polygon to a Turf-compatible polygon
        const polygonCoords = polygon.getLatLngs()[0].map(coord => [coord.lng, coord.lat]);


        // Ensure the polygon is closed (first and last coordinates are the same)
        if (
            polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
            polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]
        ) {
            polygonCoords.push(polygonCoords[0]); // Close the loop
        }

        // Check if the polygon has at least 3 distinct coordinates to be valid
        if (polygonCoords.length < 4) {
            console.error("Invalid polygon. It must have at least 3 distinct coordinates.");
            return false;
        }

        const turfPolygon = turf.polygon([polygonCoords]);

        console.log(routeLineString);
        console.log("above is the route string");




        console.log(routeLineString.geometry.coordinates);
        // const newCoordinates =routeLineString.geometry.coordinates.map(coord => {
        //     return { lng: coord.lng, lat: coord.lat };
        //   });
        const newCoordinates = routeLineString.geometry.coordinates.map(coord => [coord.lng, coord.lat]);
        console.log(newCoordinates);

        routeLineString.geometry.coordinates = newCoordinates;
        console.log(routeLineString);
        console.log(turfPolygon);
        let intersectionPoints = turf.lineIntersect(routeLineString, turfPolygon);
        console.log("intersection points");
        console.log(intersectionPoints);
        let intersectionPointsArray = intersectionPoints.features.map(d => { return d.geometry.coordinates });
        // L.geoJSON(intersectionPoints).addTo(map);

        var redIcon = L.icon({
            iconUrl: 'red_marker.png', // Replace with the URL of your red marker icon
            iconSize: [25, 41], // Adjust the icon size as needed
            iconAnchor: [12, 41], // Adjust the anchor point if necessary
            popupAnchor: [1, -34] // Adjust the popup anchor if necessary
        });
        
        L.geoJSON(intersectionPoints, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: redIcon });
            }
        }).addTo(map);

         console.log(intersectionPointsArray);
         console.log("intersectiopointarray");
  
        // let intersection = turf.lineSlice(turf.point(intersectionPointsArray[0]), turf.point(intersectionPointsArray[1]), routeLineString);
        // let intersection2 = turf.lineSlice(turf.point(intersectionPointsArray[2]), turf.point(intersectionPointsArray[3]), routeLineString);

        var lineStyle = {
            "color": "#7F00FF",
            "weight": 10,
            "opacity": 1,
            "zIndex": 100
        };



        for (var i = 0; i < intersectionPointsArray.length; i=i+2) {
            // var pair = intersectionPairs[i];
            var intersection = turf.lineSlice(turf.point(intersectionPointsArray[i]), turf.point(intersectionPointsArray[i+1]), routeLineString);
            
            L.geoJSON(intersection, {
                style: lineStyle
            }).addTo(map);
        }
     
        
        
        
        
        
        

        // L.geoJSON(intersection, {
        //     style: lineStyle
        // }).addTo(map);
        

        // L.geoJSON(intersection2, {
        //     style: lineStyle
        // }).addTo(map);
        


        for (const coordinate of routeLineString.geometry.coordinates) {
            // convertedCoordinates.push([coordinate.lat, coordinate.lng]);

            var pt = turf.point([coordinate[0], coordinate[1]]);
            // L.geoJSON(pt).addTo(map);

            try {

                if (turf.booleanPointInPolygon(pt, turfPolygon) == true) {
                    inside = inside + 1;
                    console.log("points within");
                }
                else {
                    outside = outside + 1;
                    console.log("points outside");
                }


            } catch (error) {

                console.log("this is the rerr")

            }



        }

        console.log("inside", inside);

        if (intersectionPoints.features.length > 0) {
            return true;

        }
        else {
            return false;
        }





    }
});
