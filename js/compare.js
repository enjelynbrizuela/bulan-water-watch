
const stationList = document.getElementById("stationList");
const searchStation = document.getElementById("searchStation");
const noResult = document.getElementById("noResult");

let waterStations = [];
 
async function loadStations() {
    try {
        stationList.innerHTML = "<p>Loading water stations...</p>";
        noResult.style.display = "none";

        const response = await fetch("/api/stations");

        if (!response.ok) {
            throw new Error("Failed to load water stations.");
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.stations)) {
            throw new Error(data.message || "Invalid station data.");
        }

        waterStations = data.stations.map(station => ({
            id: station.id,
            name: station.name,
            address: station.address,
            price: Number(station.price),
            phone: station.phone || "",
            hours: station.hours || "",
            delivery: station.delivery || "",
            orderType: station.order_type || "Pickup / Delivery"
        }));

        displayStations(waterStations);

    } catch (error) {
        console.error("Error loading stations:", error);

        stationList.innerHTML = "";
        noResult.textContent =
            "Unable to load water stations. Please try again.";
        noResult.style.display = "block";
    }
}
 
 function displayStations(stations) {
    if (!stationList || !noResult) return;

    stationList.innerHTML = "";

    if (stations.length === 0) {
        noResult.textContent = "No water stations found.";
        noResult.style.display = "block";
        return;
    }

    noResult.style.display = "none";

    stations.forEach(station => {
        const card = document.createElement("a");

        card.href = "station-details.html";
        card.className = "station-card";

        card.dataset.name = station.name;
        card.dataset.price = station.price;

        card.addEventListener("click", function () {
            sessionStorage.setItem(
                "selectedWaterStation",
                JSON.stringify(station)
            );
        });

        const info = document.createElement("div");
        info.className = "station-info";

        const name = document.createElement("h2");
        name.textContent = station.name;

        const address = document.createElement("p");
        address.textContent = station.address;

        const service = document.createElement("p");
        service.textContent = station.orderType;

        info.appendChild(name);
        info.appendChild(address);
        info.appendChild(service);

        const price = document.createElement("div");
        price.className = "price";
        price.textContent = "₱" + station.price.toFixed(2);

        card.appendChild(info);
        card.appendChild(price);

        stationList.appendChild(card);
    });
}

 if (searchStation) {
    searchStation.addEventListener("input", function () {
        const searchValue = this.value.toLowerCase().trim();

        const filteredStations = waterStations.filter(station => {
            return (
                station.name.toLowerCase().includes(searchValue) ||
                station.address.toLowerCase().includes(searchValue)
            );
        });

        displayStations(filteredStations);
    });
}

 loadStations();
