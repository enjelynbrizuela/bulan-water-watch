
const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const successModal = document.getElementById("successModal");
const errorModal = document.getElementById("errorModal");
const forgotModal = document.getElementById("forgotModal");

const errorMessage = document.getElementById("errorMessage");
const togglePassword = document.getElementById("togglePassword");
const continueBtn = document.getElementById("continueBtn");
const closeError = document.getElementById("closeError");
const closeForgot = document.getElementById("closeForgot");

const submitButton = loginForm.querySelector('[type="submit"]');

 togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "Show";
    }
});

 loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError("Please enter your email and password.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Invalid email or password.");
        }

         sessionStorage.setItem("waterWatchToken", data.token);
        sessionStorage.setItem(
            "waterWatchCurrentUser",
            JSON.stringify(data.user)
        );

        successModal.classList.add("show");

    } catch (error) {
        showError(error.message || "Unable to connect to the server.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Sign in";
    }
});

 continueBtn.addEventListener("click", function () {
    const user = JSON.parse(
        sessionStorage.getItem("waterWatchCurrentUser") || "null"
    );

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (user.role === "Admin") {
        window.location.href = "admin/dashboard.html";
    } else if (user.role === "Station Operator") {
        window.location.href = "admin/dashboard.html";
    } else if (user.role === "Customer") {
        window.location.href = "compare.html";
    } else {
        sessionStorage.removeItem("waterWatchCurrentUser");
        sessionStorage.removeItem("waterWatchToken");

        successModal.classList.remove("show");
        showError("Unauthorized account type.");
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.add("show");
}

closeError.addEventListener("click", function () {
    errorModal.classList.remove("show");
});

 document.getElementById("forgotPassword").addEventListener("click", function (e) {
    e.preventDefault();
    forgotModal.classList.add("show");
});

closeForgot.addEventListener("click", function () {
    forgotModal.classList.remove("show");
});

 [errorModal, forgotModal].forEach(modal => {
    modal.addEventListener("click", function (e) {
        if (e.target === modal) {
            modal.classList.remove("show");
        }
    });
});
