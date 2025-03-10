import React, { useState } from "react";
import axios from "axios";
import * as toGeoJSON from "@mapbox/togeojson";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";

const App = () => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [summary, setSummary] = useState({});
  const [details, setDetails] = useState({});
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a KML file");

    const formData = new FormData(); // create a new form data object
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://localhost:5000/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      console.log("File uploaded successfully", response.data);

      const reader = new FileReader(); // ye ek browser provided object hai jo file read karne ke liye use hota hai
      reader.onload = (e) => {
        const parser = new DOMParser(); //Provides the ability to parse XML or HTML source code from a string into a DOM Document.
        const kml = parser.parseFromString(e.target.result, "text/xml");
        const geojson = toGeoJSON.kml(kml);
        setGeoJsonData(geojson);
        generateSummary(geojson);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error uploading file", error);
    }
  };

  const generateSummary = (geojson) => {
    let elementCounts = {};
    let detailData = {};

    geojson.features.forEach((feature) => {
      const type = feature.geometry.type;

      // Count elements
      elementCounts[type] = (elementCounts[type] || 0) + 1;

      // Calculate total length for LineString & MultiLineString
      if (type === "LineString" || type === "MultiLineString") {
        const coords = feature.geometry.coordinates;
        let totalLength = 0;

        for (let i = 1; i < coords.length; i++) {
          const [lon1, lat1] = coords[i - 1];
          const [lon2, lat2] = coords[i];
          totalLength += haversineDistance(lat1, lon1, lat2, lon2);
        }

        detailData[type] = (detailData[type] || 0) + totalLength;
      }
    });

    setSummary(elementCounts);
    setDetails(detailData);
  };

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const toRad = (angle) => (angle * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Upload and View KML File</h2>
      <input type="file" accept=".kml" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload & Parse</button>

      {Object.keys(summary).length > 0 && ( // Check if summary object is not empty before rendering
        <>
          <h3>Summary</h3>
          <table border="1">
            <thead>
              <tr>
                <th>Element Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary).map(([type, count]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {Object.keys(details).length > 0 && (
        <>
          <h3>Detailed View</h3>
          <table border="1">
            <thead>
              <tr>
                <th>Element Type</th>
                <th>Total Length (km)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(details).map(([type, length]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{length.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {geoJsonData && (
        <MapContainer
          center={[20, 78]}
          zoom={5}
          style={{ height: "400px", width: "80%", margin: "20px auto" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON data={geoJsonData} />
        </MapContainer>
      )}
    </div>
  );
};

export default App;
