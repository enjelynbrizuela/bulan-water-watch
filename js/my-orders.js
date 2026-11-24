const currentUser = sessionStorage.getItem("waterWatchCurrentUser");
const token = sessionStorage.getItem("waterWatchToken");

if (!currentUser || !token) {
    window.location.href = "login.html";
}

const user = JSON.parse(currentUser);

const orderHistory = document.getElementById("orderHistory");
const noHistory = document.getElementById("noHistory");
const successModal = document.getElementById("successModal");
 
async function apiRequest(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (response.status === 401) {
        sessionStorage.removeItem("waterWatchToken");
        sessionStorage.removeItem("waterWatchCurrentUser");
        window.location.href = "login.html";
        throw new Error("Your session has expired.");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load orders.");
    }

    return data;
}
 
function formatDate(value) {
    if (!value) return "Not available";

    let dateValue = value;

    if (typeof value === "string" && !value.includes("T")) {
        dateValue = value.replace(" ", "T");
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}
 
function getDisplayStatus(order) {
    const adminStatus = String(order.adminStatus || "Pending").toLowerCase();
    const groupStatus = String(order.groupStatus || "Open").toLowerCase();

    if (adminStatus === "rejected") return "Rejected";
    if (adminStatus === "completed") return "Completed";
    if (adminStatus === "approved") return "Approved";
    if (groupStatus === "completed") return "Completed";
    if (groupStatus === "confirmation" || groupStatus === "closed") {
        return "Confirmation";
    }

    return "Pending";
}

 

async function displayOrders() {
    if (!orderHistory || !noHistory) {
        console.error("Order History elements not found in HTML.");
        return;
    }

    orderHistory.innerHTML = "";
    noHistory.style.display = "none";

    try {
        const data = await apiRequest("/api/my-orders");
        const orders = data.orders || [];

        if (orders.length === 0) {
            noHistory.style.display = "block";
            return;
        }

        orders.forEach(order => {
            createOrderCard(order);
        });

    } catch (error) {
        console.error("Loading my orders error:", error);

        noHistory.style.display = "block";
        noHistory.textContent = error.message;
    }
}
 

function createOrderCard(order) {
    const card = document.createElement("div");
    card.className = "order-card";

    const heading = document.createElement("div");
    heading.className = "order-heading";

    const stationName = document.createElement("h3");
    stationName.textContent = order.station || "Water Station";

    const statusLabel = document.createElement("span");
    statusLabel.className = "status";

    const status = getDisplayStatus(order);
    statusLabel.textContent = status;

    if (status === "Completed" || status === "Approved") {
        statusLabel.classList.add("completed");
    } else if (status === "Confirmation") {
        statusLabel.classList.add("confirmed");
    } else if (status === "Rejected") {
        statusLabel.classList.add("rejected");
    } else {
        statusLabel.classList.add("pending");
    }

    heading.appendChild(stationName);
    heading.appendChild(statusLabel);

    const details = document.createElement("div");
    details.className = "order-details";

    const quantity = Number(order.quantity) || 0;
    const orderType = order.orderType || "Pickup";
    const isCreator = Number(order.isCreator) === 1 || order.isCreator === true;

    if (isCreator) {
        details.textContent =
            "Group Creator · " +
            (quantity > 0
                ? quantity + (quantity === 1 ? " gallon" : " gallons")
                : "Quantity not specified") +
            " · " + orderType;
    } else {
        details.textContent =
            quantity +
            (quantity === 1 ? " gallon" : " gallons") +
            " · " + orderType;
    }

    const address = document.createElement("p");
    address.className = "order-reference";
    address.textContent =
        "Address: " + (order.stationAddress || "Not available");

    const price = document.createElement("p");
    price.className = "order-reference";
    price.textContent =
        "Price: ₱" +
        Number(order.price || order.participantPrice || 0).toFixed(2) +
        " per gallon";

    const reference = document.createElement("p");
    reference.className = "order-reference";
    reference.textContent =
        "Order: " + (order.groupReference || order.groupId || "N/A");

    const deadline = document.createElement("p");
    deadline.className = "order-reference";
    deadline.textContent = "Deadline: " + formatDate(order.deadline);

    const joinedDate = document.createElement("p");
    joinedDate.className = "order-reference";
    joinedDate.textContent = "Date joined/created: " + formatDate(order.dateJoined);

    const viewButton = document.createElement("button");
    viewButton.className = "view-btn";
    viewButton.textContent = "View Details";

    viewButton.addEventListener("click", function() {
        sessionStorage.setItem("selectedMyOrder", JSON.stringify({
            ...order,
            status
        }));

        successModal.classList.add("show");
    });

    card.appendChild(heading);
    card.appendChild(details);
    card.appendChild(address);
    card.appendChild(price);
    card.appendChild(reference);
    card.appendChild(deadline);
    card.appendChild(joinedDate);
    card.appendChild(viewButton);

    orderHistory.appendChild(card);
}
 

document.getElementById("successContinue").addEventListener("click", function() {
    window.location.href = "order-status.html";
});

successModal.addEventListener("click", function(event) {
    if (event.target === successModal) {
        successModal.classList.remove("show");
    }
});

 
displayOrders();
