 let selectedStation = null;

try {
    selectedStation = JSON.parse(
        sessionStorage.getItem("selectedWaterStation")
    );
} catch (error) {
    selectedStation = null;
}
 

const stationName = document.getElementById("stationName");
const stationPrice = document.getElementById("stationPrice");
const stationAddress = document.getElementById("stationAddress");
const stationPhone = document.getElementById("stationPhone");
const stationHours = document.getElementById("stationHours");
const stationDelivery = document.getElementById("stationDelivery");

const detailsCard = document.querySelector(".details-card");

const createGroupBtn = document.getElementById("createGroupBtn");
const openGroupsBtn = document.getElementById("openGroupsBtn");

const errorModal = document.getElementById("errorModal");
const errorMessage = document.getElementById("errorMessage");
const closeError = document.getElementById("closeError");
 

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
    }

    if (errorModal) {
        errorModal.style.display = "flex";
    }
}

 
if (closeError) {
    closeError.addEventListener("click", function () {
        errorModal.style.display = "none";
    });
}
 

function setOptionalDetail(element, value) {

    if (!element) return;

    const detailGroup = element.closest(".detail-group");

    if (value && value.trim() !== "") {
        element.textContent = value;

        if (detailGroup) {
            detailGroup.style.display = "block";
        }
    } else {
        if (detailGroup) {
            detailGroup.style.display = "none";
        }
    }
}
 

function loadStationDetails() {

    if (!selectedStation) {

        stationName.textContent = "No Station Selected";
        stationPrice.textContent = "N/A";
        stationAddress.textContent =
            "Please select a station from Compare Prices.";

        if (detailsCard) {
            detailsCard.style.display = "none";
        }

        showError("Please select a water station first from Compare Prices.");

        return;
    }
 

    stationName.textContent =
        selectedStation.name || "Water Station";

 

    stationPrice.textContent =
        selectedStation.price !== undefined &&
        selectedStation.price !== null
            ? "₱" + selectedStation.price
            : "Price not available";

 
    if (stationAddress) {
        const addressGroup = stationAddress.closest(".detail-group");

        if (selectedStation.address) {
            stationAddress.textContent = selectedStation.address;

            if (addressGroup) {
                addressGroup.style.display = "block";
            }
        } else if (addressGroup) {
            addressGroup.style.display = "none";
        }
    }

 
    setOptionalDetail(
        stationPhone,
        selectedStation.phone
    );

 

    setOptionalDetail(
        stationHours,
        selectedStation.hours
    );

 
    setOptionalDetail(
        stationDelivery,
        selectedStation.delivery
    );

}

 
if (createGroupBtn) {

    createGroupBtn.addEventListener("click", function () {

        if (!selectedStation) {
            showError("Please select a station first.");
            return;
        }

        sessionStorage.setItem(
            "selectedWaterStation",
            JSON.stringify(selectedStation)
        );

        window.location.href = "create-group-order.html";

    });

}
 
if (openGroupsBtn) {

    openGroupsBtn.addEventListener("click", function () {
        window.location.href = "group-orders.html";
    });

}

 
loadStationDetails();
