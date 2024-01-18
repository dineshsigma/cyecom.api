const pool = require("../config/config").pool;
const moment = require("moment");
const axios = require("axios");

function getarray(data) {
    let data1 = `'`;
    for (let i = 0; i < data.length; i++) {
        data1 += data[i] + `','`;
    }
    return data1.substring(0, data1.length - 2);
}


async function runBillingStatement(req, res) {
    const client = await pool.connect();
    const organisations = await client.query(`SELECT * FROM public.organization`);
    try {
        if (organisations.rowCount > 0) {
            for (let i = 0; i < organisations.rowCount; i++) {
                const organization = await client.query(`SELECT * FROM public.organization WHERE id = ${organisations.rows[i].id} AND is_delete = false AND is_active = true AND billing_status = 'ACTIVE'`);
                if (organization.rowCount > 0) {
                    const { id: organizationId, cost_per_user } = organization.rows[0];
                    const activeUsers = await client.query(`SELECT * FROM public.user_org WHERE org_id = ${organizationId} AND is_delete = false AND is_active = true`);
                    const activeUsersCount = activeUsers.rowCount;
                    const day_total_amount = activeUsersCount * cost_per_user;

                    const billing_statement = await client.query(`SELECT * FROM public.billing_statement WHERE org_id = ${organizationId} ORDER BY id DESC`);

                    let total_amount;
                    let existedDate;
                    let currentDate;

                    if (billing_statement.rowCount > 0) {
                        existedDate = billing_statement.rows[0].date.toISOString().split("T")[0];
                        currentDate = new Date().toISOString().split("T")[0];
                    }

                    if (billing_statement.rowCount === 0) total_amount = day_total_amount;
                    else if (new Date(existedDate) < new Date(currentDate))
                        total_amount = day_total_amount + billing_statement.rows[0].total_amount;
                    else total_amount = billing_statement.rows[0].total_amount;

                    const billing_statement_object = {
                        org_id: organizationId,
                        active_users_count: activeUsersCount,
                        total_amount,
                        day_total_amount,
                        cost_per_user,
                        month: new Date().getMonth() + 1,
                        year: new Date().getFullYear(),
                    };
                    const billing_statement_record = await client.query(`SELECT * FROM public.billing_statement WHERE DATE(date) = DATE('${new Date().toISOString()}') AND org_id = ${organizationId}`);
                    if (billing_statement_record.rowCount > 0) {
                        const { org_id, active_users_count, total_amount, day_total_amount, cost_per_user, month, year } = billing_statement_object;

                        await client.query(`UPDATE public.billing_statement SET org_id = ${org_id}, active_users_count = ${active_users_count},
                    total_amount = ${total_amount}, day_total_amount = ${day_total_amount}, cost_per_user = ${cost_per_user}, 
                    month = ${month}, year = ${year} WHERE id = ${billing_statement_record.rows[0].id}`);
                    } else {
                        await client.query(`INSERT INTO public.billing_statement(${Object.keys(billing_statement_object)}) VALUES(${Object.values(billing_statement_object)})`);
                    }
                }
            }
            return res.status(200).json({ status: true, message: "Billing statement job runs successfully" })
        } else {
            return res.status(409).json({ status: false, message: "No Active Organizations found" })
        }

    } catch (error) {
        console.log(error);
    } finally {
        client.release();
    }
}


async function runBillingMaster(req, res) {
    const client = await pool.connect();

    try {
        const billing_statement_record = await client.query(`SELECT DISTINCT org_id FROM public.billing_statement`);

        for (let i = 0; i < billing_statement_record.rowCount; i++) {
            const billing_statement = await client.query(`SELECT * FROM public.billing_statement WHERE org_id = ${billing_statement_record.rows[i].org_id} ORDER BY id DESC `);

            const { org_id, total_amount, month, year } = billing_statement.rows[0];
            const billing_code = `BILL${org_id}${month}${year}`;

            const billing_master = await client.query(`SELECT * FROM public.billing_master WHERE billing_code = '${billing_code}'`);

            if (billing_master.rowCount === 0) {
                const user_result = await client.query(`SELECT u.name, u.email, u.phone FROM public.user_org ur JOIN users u ON ur.user_id = u.id WHERE ur.org_id = ${billing_statement_record.rows[i].org_id} and ur.reporting_manager = 0 and ur.is_delete = false and ur.is_active=true`);

                if (user_result.rowCount > 0) {
                    let user_data = user_result.rows[0];
                    user_data.amount = total_amount;
                    user_data.billing_code = billing_code;
                    const { data } = await axios.post("https://cyecom-api-qa.iipl.work/api/v1/paymentGateway", user_data);
                    const { id, status } = data.response;
                    const billing_master_object = {
                        org_id,
                        total_amount,
                        month,
                        year,
                        payment_link_id: id,
                        status,
                        billing_code,
                    };

                    await client.query(`INSERT INTO public.billing_master(${Object.keys(billing_master_object)}) VALUES(${getarray(Object.values(billing_master_object))})`);
                }
            }
        }
        return res.json({ status: true, message: "Billing Master Job Runs Successfully" })
    } catch (error) {
        console.log(error);
    } finally {
        client.release();
    }
}


async function orgbillingInvoiceStatus(req, res) {
    const client = await pool.connect();

    try {
        // getting all organizations.
        const { rows: org_rows, rowCount: org_rowCount } = await client.query(`SELECT * FROM public.organization WHERE is_active = true AND is_delete = false`);

        // check whether the bill generated for given organization or not.
        for (let i = 0; i < org_rowCount; i++) {
            const { rowCount: master_rowCount } = await client.query(`SELECT * FROM public.billing_master WHERE org_id = ${org_rows[i].id}`);

            // if given condition is satisfied, it means the bill generated for gven organizarion.
            if (master_rowCount > 0) {
                // here the given organization can have multiple bills generated.
                const { rows } = await client.query(`SELECT * FROM public.billing_master WHERE org_id = ${org_rows[i].id}`);
                const isPaid = rows.every(row => row.status === "paid");
                const warning = rows.some((row) => row.status !== "paid" && moment().diff(moment(row.created_at), "days") >= 10 && moment().diff(moment(row.created_at), "days") <= 15);
                const onhold = rows.some((row) => row.status !== "paid" && moment().diff(moment(row.created_at), "days") >= 15);

                if (isPaid) {
                    await client.query(`UPDATE public.organization SET billing_status = 'ACTIVE' WHERE id = ${org_rows[i].id}`);
                }
                if (warning) {
                    await client.query(`UPDATE public.organization SET billing_status = 'WARNING' WHERE id = ${org_rows[i].id}`);
                }
                if (onhold) {
                    await client.query(`UPDATE public.organization SET billing_status = 'ONHOLD' WHERE id = ${org_rows[i].id}`);
                }
            }
        }
        return res.json({ status: true, message: "Org invoice status job runs successfully" })
    } catch (error) {
        console.log(error);
    } finally {
        client.release()
    }
}

// orgbillingInvoiceStatus();
module.exports.runBillingStatement = runBillingStatement;
module.exports.runBillingMaster = runBillingMaster;
module.exports.orgbillingInvoiceStatus = orgbillingInvoiceStatus;