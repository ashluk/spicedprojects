const express = require("express");
const app = express();
const db = require("./db");
const hb = require("express-handlebars");
const { hash, compare } = require("./utils/bc.js");
const cookieSession = require("cookie-session");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(
    cookieSession({
        secret: `I'm always hungry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);

console.log("db", db);

app.use(express.static("./public"));

app.use(
    express.urlencoded({
        extended: false,
    })
);

//PETITION ROUTE
app.get("/petition", (req, res) => {
    if (req.session.signed) {
        res.redirect("/thanks");
    } else {
        res.render("petition", {});
    }
    /* if (user_first === !undefined && user_last === !undefined) {
        res.redirect("/thanks");
    }*/
});

app.post("/petition", (req, res) => {
    const { signature } = req.body;
    console.log("requested body", req.body);
    console.log("req session", req.session);
    db.addSignature(signature, req.session.userid)
        .then(({ rows }) => {
            console.log("rows: ", rows);
            req.session.signed = rows[0].id;

            res.redirect("/thanks");
        })
        .catch((err) => {
            console.log("petition error", err);
            res.render("petition", {
                err: true,
            });
        });
});
//REGISTER ROUTE

app.get("/register", (req, res) => {
    res.render("register", {});
});

app.post("/register", (req, res) => {
    const { user_first, user_last, email, password_hash } = req.body;
    // console.log("requested body", req.body);
    hash(password_hash)
        .then((hashedPassword) => {
            db.addUserInput(user_first, user_last, email, hashedPassword)
                .then(({ rows }) => {
                    console.log("rows: ", rows);
                    req.session.userid = rows[0].id;

                    res.redirect("/petition");
                })
                .catch((err) => {
                    console.log("register error", err);
                    res.render("register", {
                        err: true,
                    });
                });
        })
        .catch((err) => {
            console.log("error in hash", err);
            res.render("register", {
                err: true,
            });
        });
});
////LOGIN ROUTE

app.get("/login", (req, res) => {
    res.render("login", {});
});
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    console.log("email, password", req.body);
    if (!req.session.userid) {
        console.log("!req.session.userid", req.session.userid);
        res.render("login", {
            err: true,
        });
    } else if (email == "") {
        console.log("!email");

        res.render("login", {
            err: "error in email",
        });
    } else if (password == "") {
        console.log("!password");
        res.render("login", {
            err: "error in password",
        });
    }
    db.passwordCompare(email)
        .then(({ rows }) => {
            console.log("rows id", rows);
            compare(password, rows[0].password_hash).then((match) => {
                if (match) {
                    req.session.userid = rows[0].id;
                    res.redirect("/petition");
                    console.log("matched id");
                } else {
                    res.render("login", {
                        err: true,
                    });
                }
                // match will be true or false ;)
            });
        })
        .catch((err) => {
            console.log("error in login", err);
            res.render("login", {
                err: true,
            });
        });
});

///////////////

app.get("/signers", (req, res) => {
    db.getSigners()
        .then(({ rows }) => {
            var fullNames = rows;
            console.log("fullnames", fullNames);
            res.render("signers", {
                fullNames,
            });
        })
        .catch((err) => console.log("error in signers page", err));
});

app.get("/thanks", (req, res) => {
    if (req.session.signed) {
        db.signatureId(req.session.signed)
            .then(({ rows }) => {
                console.log("rows: ", rows);
                var signatureImage = rows[0];
                //console.log("signatureImage", signatureImage);
                /*res.render("thanks", {
                    rows,
                });*/
                db.getCount().then(({ rows }) => {
                    var signerNumber = rows[0];
                    console.log("signerNumber", signerNumber);
                    res.render("thanks", {
                        signatureImage,
                        signerNumber,
                    });
                });
            })

            .catch((err) => console.log("error in thanks page", err));
    } else {
        res.redirect("/petition");
    }
});

app.get("/", (req, res) => {
    res.redirect("/register");
});
app.get("/profile", (req, res) => {
    res.render("profile", {});
});

app.listen(process.env.PORT || 8080, () =>
    console.log("Petition up and running....")
);
