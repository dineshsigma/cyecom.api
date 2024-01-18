let config = require('./config.js').config;
const Pool = require('pg-pool');
const pool = new Pool(config.dbconnection)

 let user_idsArray =[];
async function escalations_leve2(assigneeid,allids){

    try{
        for(let i=0;i<assigneeid.length;i++){
                  let id=  await getReportingManager(assigneeid[i],allids);
                }
            }
    catch(error){
        console.log("error---",error);
    }
}
async function getReportingManager(assigneeid,allids){
    try{
            const client = await pool.connect();
                let usersquery = `select user_id,reporting_manager  from  public.user_org where user_id=${assigneeid} and org_id=131`;
                let  getSingleUserRes = await client.query(usersquery);
                if(getSingleUserRes.rowCount<=0||getSingleUserRes.rows[0].reporting_manager == 0){

                    return assigneeid
                }
                else{
                    allids.push(getSingleUserRes.rows[0].reporting_manager);
                  let id=  await getReportingManager(getSingleUserRes.rows[0].reporting_manager,allids);

                }
            }
    catch(error){
        console.log("error---",error);
    }
}
async function getall(input_ids){
    var allids=[];
   await escalations_leve2(input_ids,allids);
   let all=[...input_ids,...allids]
}
getall([191])