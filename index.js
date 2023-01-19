const enVars = require("dotenv").config().parsed;
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const axios = require("axios");
const { response } = require("express");

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false }));

const ADMIN_API_KEY = enVars.API_KEY;
const ORG_ID = enVars.ORG_ID;

async function createEnv(name, wsId, prefix, isProd) {
  var data = JSON.stringify({
    name: `${prefix}-${name}`,
    production: isProd,
    changePermissions: {
      allowKills: false,
      areApprovalsRequired: false,
      areApproversRestricted: false,
      areEditorsRestricted: false,
    },
    dataExportPermissions: {
      areExportersRestricted: false,
    },
  });

  var config = {
    method: "post",
    url: `https://api.split.io/internal/api/v2/environments/ws/${wsId}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_API_KEY}`,
    },
    data: data,
  };
  try {
    let response = await axios(config);
    return {success: true};
  } catch (error) {
    return {success: false, code: error.response.data.code , msg: error.response.data.message};
  }
}

async function createTT(ttName, wsId) {
  var data = JSON.stringify({
    name: ttName,
  });

  var config = {
    method: "post",
    url: `https://api.split.io/internal/api/v2/trafficTypes/ws/${wsId}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_API_KEY}`,
    },
    data: data,
  };
  try {
    let response = await axios(config);
    return {success: true}
  } catch (error) {
    return {success: false, code: error.response.data.code , msg: error.response.data.message};
  }
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/createWS", (req, res) => {
  const values = req.body;
  var data = JSON.stringify({
    name: values.team,
    requiresTitleAndComments:
      typeof values.comments !== "undefined" && values.comments == "true"
        ? "true"
        : "false",
  });

  var config = {
    method: "post",
    url: "https://api.split.io/internal/api/v2/workspaces",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_API_KEY}`,
    },
    data: data,
  };

  axios(config)
    .then(function (workspaces) {
      //console.log(workspaces);
        if (typeof values.environments !== "undefined") {
          values.environments.forEach(function (v) {
            let isProd = false;
            if (v == "Prod") {
              isProd = true;
            }
            createEnv(workspaces.data.name, workspaces.data.id, v, isProd)
       
        });
        }
        if (typeof values.traffictypes !== "undefined") {
          values.traffictypes.forEach(function (v) {
            let result = createTT(v, workspaces.data.id);

          });
        }
   

      res.render("result", {
        ORGID: ORG_ID,
        WSID: workspaces.data.id,
        WSNAME: workspaces.data.name,
        WSREQCOMMENTS: workspaces.data.requiresTitleAndComments,
        ENVS: values.environments.join(", "),
        TTS: values.traffictypes.concat(["user"].join(", ")),
      });
    
    })
    .catch(function (error) {
      res.render("error", {
        ERRMSG: error.response.data.message,
        ERRCODE: error.response.data.code,
      });
    });
});

app.listen(3201, () => {
  console.log("server started on port 3201");
});
