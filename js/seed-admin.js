 

const accounts = JSON.parse(
    localStorage.getItem("waterWatchAccounts") || "[]"
);

const adminEmail = "operate@admin";
 
const existingAdmin = accounts.find(
    account => account.email.toLowerCase() === adminEmail
);

if (!existingAdmin) {

    accounts.push({
        fullname: "Station Operator",
        email: "operate@admin",
        password: "operate@password",
        role: "Station Operator"
    });

    localStorage.setItem(
        "waterWatchAccounts",
        JSON.stringify(accounts)
    );

}