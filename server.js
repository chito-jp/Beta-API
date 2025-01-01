import express from "express";
import fs from "fs";
import path from "path";
import {Beta} from "@chitose-jp/tetrisbeta-api";

const app=express();
const allowCrossDomain = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "*");
  next();
};
app.use(allowCrossDomain);

const api=new Beta("chito-bot");

app.get("/",(req,res)=>{
  res.setHeader("Content-Type", "text/html");
  res.send(fs.readFileSync(path.join("todo.html"),"utf-8"));
});

app.get("/api/id/:name",async(req,res)=>{
  const {name}=req.params;
  res.json({name,data:await api.getId(name)});
});

app.get("/api/auth/:name",async(req,res)=>{
  const {name}=req.params;
  res.json({name,data:await api.getAuth(name)});
});

app.get("/api/user/:target/:name",async(req,res)=>{
  const {target,name}=req.params;
  res.json(await api.getUser(target,name));
});

const paths=[
  "/api/ranking/40line/:name",
  "/api/ranking/20line/:name",
  "/api/ranking/marathon/:name",
  "/api/ranking/ultra/:name",
  "/api/ranking/rate/:name",
  "/api/ranking/level/:name",
  "/api/ranking/apm/:name",
  "/api/ranking/pps/:name",
  "/api/ranking/playtime/:name",
  "/api/ranking/follower/:name"
];

for(let i=0;i<paths.length;i++)app.get(paths[i],async(req,res)=>{
  const {name}=req.params;
  res.json(await api.getRanking(i,name));
});
app.get("/api/data",(req,res)=>{
  res.json(JSON.parse(fs.readFileSync("data.json")));
});


const PORT=process.env.PORT || 7777;
const listener=app.listen(PORT,()=>{console.log(`Server is running on PORT ${listener.address().port}`);});
