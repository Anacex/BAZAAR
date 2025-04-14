const EventEmitter = require("events");
const pool = require("./db");

const emitter = new EventEmitter();

//handle audit logs
emitter.on("audit", async (data)=>{
    try{
        await pool.query(
            'Insert into audit_logs(user_id, store_id, action, details) values ($1, $2, $3, $4)',
            [data.user_id, data.store_id, data.action, data.details]
        );
        console.log("Audit log recorded: ", data.action);

    }catch(err){
        console.error("Failed to write audit log: ", err.message);
    }
});

module.exports = emitter;