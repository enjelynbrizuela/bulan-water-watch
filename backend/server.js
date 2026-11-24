
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_PATH = path.resolve(__dirname, '..');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in .env');
}

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Admin credentials are missing in .env');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(FRONTEND_PATH, {
    index: false,
    dotfiles: 'deny'
}));


app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'login.html'));
});

app.get('/create-account.html', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'create-account.html'));
}); 

app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        res.json({
            success: true,
            message: 'Bulan Water-Watch API connected.',
            database: 'Connected'
        });

    } catch (error) {
        console.error('Health check error:', error);

        res.status(500).json({
            success: false,
            message: 'Database connection failed.'
        });
    }
});
 

async function seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName =
        process.env.ADMIN_NAME || 'Water Watch Administrator';

    const [existing] = await db.query(
        'SELECT id FROM users WHERE LOWER(email) = ?',
        [adminEmail]
    );

    if (existing.length > 0) {
        console.log('Admin account already exists.');
        return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await db.query(
        `INSERT INTO users
        (fullname, email, password_hash, role)
        VALUES (?, ?, ?, 'Admin')`,
        [adminName, adminEmail, passwordHash]
    );

    console.log('Admin account created successfully.');
} 

app.post('/api/auth/register', async (req, res) => {
    try {
        const {
            fullname,
            email,
            phone,
            password,
            confirmPassword
        } = req.body;

        if (!fullname || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please complete all required fields.'
            });
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match.'
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters.'
            });
        }

        const cleanName = String(fullname).trim();
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPhone = String(phone).trim();

        if (!/^09[0-9]{9}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 11-digit phone number starting with 09.'
            });
        }

        const [existing] = await db.query(
            'SELECT id FROM users WHERE LOWER(email) = ?',
            [cleanEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email is already registered.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [result] = await db.query(
            `INSERT INTO users
            (fullname, email, phone, password, password_hash, role)
            VALUES (?, ?, ?, ?, ?, 'Customer')`,
            [
                cleanName,
                cleanEmail,
                cleanPhone,
                passwordHash,
                passwordHash
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            user: {
                id: result.insertId,
                fullname: cleanName,
                email: cleanEmail,
                phone: cleanPhone,
                role: 'Customer'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);

        return res.status(500).json({
            success: false,
            message: 'Registration failed.'
        });
    }
}); 

app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, fullname, email, phone, role
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        return res.json({
            success: true,
            user: rows[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load profile.'
        });
    }
});
 

app.put('/api/profile', verifyToken, async (req, res) => {
    try {
        const fullname = String(req.body.fullname || '').trim();
        const phone = String(req.body.phone || '').trim();

        if (!fullname || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please complete all required fields.'
            });
        }

        if (!/^09[0-9]{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 11-digit phone number starting with 09.'
            });
        }

        const [result] = await db.query(
            `UPDATE users
             SET fullname = ?, phone = ?
             WHERE id = ?`,
            [fullname, phone, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const [rows] = await db.query(
            `SELECT id, fullname, email, phone, role
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        return res.json({
            success: true,
            message: 'Profile updated successfully.',
            user: rows[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to update profile.'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const loginEmail = String(email).trim().toLowerCase();

        const [users] = await db.query(
            `SELECT id, fullname, email, password_hash, role
             FROM users
             WHERE LOWER(email) = ?`,
            [loginEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        res.json({
            success: true,
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        res.status(500).json({
            success: false,
            message: 'Login failed.'
        });
    }
}); 

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Please log in to continue.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired login session. Please log in again.'
        });
    }
} 

function verifyAdmin(req, res, next) {
    if (
        !req.user ||
        String(req.user.role).toLowerCase() !== 'admin'
    ) {
        return res.status(403).json({
            success: false,
            message: 'Admin access only.'
        });
    }

    next();
} 

app.get('/api/stations', async (req, res) => {
    try {
        const [stations] = await db.query(
            `SELECT
                ws.id,
                ws.name,
                ws.address,
                ws.price,
                ws.phone,
                ws.hours,
                ws.delivery,
                ws.order_type
             FROM water_stations ws
             INNER JOIN (
                SELECT MIN(id) AS id
                FROM water_stations
                GROUP BY name, address
             ) unique_stations
             ON ws.id = unique_stations.id
             ORDER BY ws.name ASC`
        );

        res.json({
            success: true,
            stations
        });

    } catch (error) {
        console.error('Stations error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to load water stations.'
        });
    }
});
 

app.post('/api/group-orders', verifyToken, async (req, res) => {
    let connection;

    try {
        const {
            stationId,
            orderType,
            deadline,
            minimumGallons,
            maxParticipants,
            notes
        } = req.body;

        const userId = req.user.id;

        if (
            !stationId ||
            !orderType ||
            !deadline ||
            minimumGallons === undefined ||
            maxParticipants === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please complete all required group order fields.'
            });
        }

        const cleanOrderType = String(orderType).trim();

        if (!['Pickup', 'Delivery'].includes(cleanOrderType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order type.'
            });
        }

        const parsedStationId = Number(stationId);

        if (
            !Number.isInteger(parsedStationId) ||
            parsedStationId < 1
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid water station.'
            });
        }

        const minGallons = Number(minimumGallons);
        const maxPeople = Number(maxParticipants);

        if (
            !Number.isInteger(minGallons) ||
            minGallons < 1 ||
            minGallons > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Minimum gallons must be between 1 and 100.'
            });
        }

        if (
            !Number.isInteger(maxPeople) ||
            maxPeople < 2 ||
            maxPeople > 50
        ) {
            return res.status(400).json({
                success: false,
                message: 'Maximum participants must be between 2 and 50.'
            });
        }

         const cleanDeadline = String(deadline).trim();

        if (
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cleanDeadline)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid deadline format.'
            });
        }

         const mysqlDeadline =
            cleanDeadline.replace('T', ' ') + ':00';

         const phParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(new Date());

        const phNow = {};

        phParts.forEach(part => {
            phNow[part.type] = part.value;
        });

        const currentPHDateTime =
            `${phNow.year}-${phNow.month}-${phNow.day}T` +
            `${phNow.hour}:${phNow.minute}`;

        if (cleanDeadline <= currentPHDateTime) {
            return res.status(400).json({
                success: false,
                message: 'The deadline must be a future date and time.'
            });
        }

         const [stations] = await db.query(
            `SELECT id, name, address, price, phone
             FROM water_stations
             WHERE id = ?`,
            [parsedStationId]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Selected water station was not found.'
            });
        }

        const station = stations[0];
        const stationPrice = Number(station.price);

         const [users] = await db.query(
            `SELECT id, fullname, email, role
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User account not found. Please log in again.'
            });
        }

        const customer = users[0];

        if (String(customer.role).toLowerCase() !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customer accounts can create group orders.'
            });
        }

         const groupReference =
            'WW-' + Date.now() + '-' +
            crypto.randomBytes(3).toString('hex').toUpperCase();

        const participantReference =
            'OWNER-' + Date.now() + '-' +
            crypto.randomBytes(3).toString('hex').toUpperCase();

         connection = await db.getConnection();

        await connection.beginTransaction();

         const [groupResult] = await connection.query(
            `INSERT INTO group_orders
            (
                reference_id,
                user_id,
                station_id,
                order_type,
                deadline,
                minimum_gallons,
                max_participants,
                notes,
                price,
                participants,
                total_gallons,
                status,
                admin_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'Open', 'Pending')`,
            [
                groupReference,
                userId,
                parsedStationId,
                cleanOrderType,
                mysqlDeadline,
                minGallons,
                maxPeople,
                notes ? String(notes).trim() : null,
                stationPrice
            ]
        );

        const groupOrderId = groupResult.insertId;

         await connection.query(
            `INSERT INTO group_participants
            (
                reference_id,
                group_order_id,
                user_id,
                quantity,
                price,
                status,
                is_creator
            )
            VALUES (?, ?, ?, 0, ?, 'Open', 1)`,
            [
                participantReference,
                groupOrderId,
                userId,
                stationPrice
            ]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Group order created successfully.',
            group: {
                id: groupOrderId,
                reference_id: groupReference,
                user_id: userId,
                station_id: parsedStationId,
                station_name: station.name,
                station_address: station.address,
                phone: station.phone,
                order_type: cleanOrderType,
                deadline: mysqlDeadline,
                minimum_gallons: minGallons,
                max_participants: maxPeople,
                notes: notes ? String(notes).trim() : null,
                price: stationPrice,
                participants: 1,
                total_gallons: 0,
                status: 'Open',
                admin_status: 'Pending'
            }
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }

        console.error('Create group order error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to create group order. Please try again.'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});
 
app.get(
    '/api/admin/group-orders',
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const [groups] = await db.query(
                `SELECT
                    go.id,
                    go.reference_id,
                    go.user_id,
                    go.station_id,

                    ws.name AS station,
                    ws.address AS station_address,

                    u.fullname AS createdBy,
                    u.email AS email,

                    go.order_type AS orderType,
                    go.deadline,
                    go.minimum_gallons AS minimumGallons,
                    go.max_participants AS maxParticipants,

                    go.notes,
                    go.price,

                    COALESCE(pc.participant_count, 0)
                        AS participantCount,

                    go.participants,
                    go.total_gallons AS totalGallons,

                    go.status,
                    go.admin_status AS adminStatus,

                    go.created_at AS dateCreated,
                    go.admin_last_updated AS adminLastUpdated

                FROM group_orders go

                INNER JOIN users u
                    ON go.user_id = u.id

                INNER JOIN water_stations ws
                    ON go.station_id = ws.id

                LEFT JOIN (
                    SELECT
                        group_order_id,
                        COUNT(*) AS participant_count
                    FROM group_participants
                    GROUP BY group_order_id
                ) pc
                    ON go.id = pc.group_order_id

                ORDER BY go.created_at DESC`
            );

            res.json({
                success: true,
                count: groups.length,
                groups
            });

        } catch (error) {
            console.error('Admin group orders error:', error);

            res.status(500).json({
                success: false,
                message: 'Unable to load customer group orders.'
            });
        }
    }
);
 

app.get('/api/group-orders', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [groups] = await db.query(
            `SELECT
                go.id,
                go.reference_id,
                go.user_id,
                go.station_id,
                ws.name AS station,
                ws.address AS station_address,
                u.fullname AS createdBy,
                u.email AS email,
                go.order_type AS orderType,
                go.deadline,
                go.minimum_gallons AS minimumGallons,
                go.max_participants AS maxParticipants,
                go.notes,
                go.price,
                go.status,
                go.admin_status AS adminStatus,
                go.created_at AS dateCreated,
                (
                    SELECT COUNT(*)
                    FROM group_participants gp
                    WHERE gp.group_order_id = go.id
                ) AS participantCount,
                go.total_gallons AS totalGallons,
                EXISTS (
                    SELECT 1
                    FROM group_participants gp2
                    WHERE gp2.group_order_id = go.id
                    AND gp2.user_id = ?
                ) AS alreadyJoined,
                (go.user_id = ?) AS isCreator
            FROM group_orders go
            INNER JOIN users u ON u.id = go.user_id
            INNER JOIN water_stations ws ON ws.id = go.station_id
            WHERE go.status = 'Open'
            AND go.admin_status = 'Pending'
            ORDER BY go.created_at DESC`,
            [userId, userId]
        );

        res.json({
            success: true,
            groups
        });

    } catch (error) {
        console.error('Get group orders error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to load group orders.'
        });
    }
});
 

app.post('/api/group-orders/:id/join', verifyToken, async (req, res) => {
    let connection;

    try {
        const groupOrderId = Number(req.params.id);
        const quantity = Number(req.body.quantity);
        const userId = req.user.id;

        if (!Number.isInteger(groupOrderId) || groupOrderId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid group order.'
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be between 1 and 20 gallons.'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [groups] = await connection.query(
            `SELECT
                id,
                user_id,
                price,
                max_participants,
                status,
                admin_status,
                deadline
            FROM group_orders
            WHERE id = ?
            FOR UPDATE`,
            [groupOrderId]
        );

        if (groups.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Group order not found.'
            });
        }

        const group = groups[0];

        if (
            group.status !== 'Open' ||
            group.admin_status !== 'Pending'
        ) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'This group order is no longer available.'
            });
        }

         const phParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(new Date());

        const phNow = {};
        phParts.forEach(part => {
            phNow[part.type] = part.value;
        });

        const currentPHDateTime =
            `${phNow.year}-${phNow.month}-${phNow.day} ` +
            `${phNow.hour}:${phNow.minute}:${phNow.second}`;

        const deadlineText = new Date(group.deadline)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');

        if (deadlineText <= currentPHDateTime) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'The deadline for this group order has passed.'
            });
        }

        const [existing] = await connection.query(
            `SELECT id
             FROM group_participants
             WHERE group_order_id = ? AND user_id = ?`,
            [groupOrderId, userId]
        );

        if (existing.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'You have already joined this group.'
            });
        }

        const [participantRows] = await connection.query(
            `SELECT COUNT(*) AS total
             FROM group_participants
             WHERE group_order_id = ?`,
            [groupOrderId]
        );

        const participantCount = Number(participantRows[0].total);

        if (participantCount >= Number(group.max_participants)) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'This group has reached its maximum participants.'
            });
        }

        const [users] = await connection.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            await connection.rollback();

            return res.status(401).json({
                success: false,
                message: 'User account not found.'
            });
        }

        const participantReference =
            'JOIN-' + Date.now() + '-' +
            crypto.randomBytes(3).toString('hex').toUpperCase();

        await connection.query(
            `INSERT INTO group_participants
            (
                reference_id,
                group_order_id,
                user_id,
                quantity,
                price,
                status,
                is_creator
            )
            VALUES (?, ?, ?, ?, ?, 'Open', 0)`,
            [
                participantReference,
                groupOrderId,
                userId,
                quantity,
                group.price
            ]
        );

        await connection.query(
            `UPDATE group_orders
             SET participants = (
                    SELECT COUNT(*)
                    FROM group_participants
                    WHERE group_order_id = ?
                 ),
                 total_gallons = total_gallons + ?
             WHERE id = ?`,
            [groupOrderId, quantity, groupOrderId]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Successfully joined the group order.'
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Join rollback error:', rollbackError);
            }
        }

        console.error('Join group order error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to join group order.'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

 

app.get('/api/my-orders', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [orders] = await db.query(
            `SELECT
                gp.id AS participantId,
                gp.reference_id AS participantReference,
                gp.quantity,
                gp.price AS participantPrice,
                gp.status AS participantStatus,
                gp.is_creator AS isCreator,
                gp.date_joined AS dateJoined,

                go.id AS groupId,
                go.reference_id AS groupReference,
                go.order_type AS orderType,
                go.deadline,
                go.minimum_gallons AS minimumGallons,
                go.max_participants AS maxParticipants,
                go.status AS groupStatus,
                go.admin_status AS adminStatus,
                go.total_gallons AS totalGallons,

                ws.name AS station,
                ws.address AS stationAddress,
                go.price AS price,

                creator.fullname AS createdBy

            FROM group_participants gp
            INNER JOIN group_orders go
                ON gp.group_order_id = go.id
            INNER JOIN water_stations ws
                ON go.station_id = ws.id
            INNER JOIN users creator
                ON go.user_id = creator.id

            WHERE gp.user_id = ?

            ORDER BY gp.date_joined DESC`,
            [userId]
        );

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('My orders error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to load your orders.'
        });
    }
});
 

app.get(
    '/api/group-orders/:id/participants',
    verifyToken,
    async (req, res) => {
        try {
            const groupId = Number(req.params.id);
            const userId = req.user.id;

            if (!Number.isInteger(groupId) || groupId < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid group order ID.'
                });
            }

             const [membership] = await db.query(
                `SELECT id
                 FROM group_participants
                 WHERE group_order_id = ?
                 AND user_id = ?`,
                [groupId, userId]
            );

            if (membership.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a participant of this group.'
                });
            }

            const [participants] = await db.query(
                `SELECT
                    gp.id,
                    gp.user_id,
                    gp.quantity,
                    gp.status,
                    gp.is_creator,
                    gp.date_joined,
                    u.fullname,
                    u.email
                 FROM group_participants gp
                 INNER JOIN users u
                    ON gp.user_id = u.id
                 WHERE gp.group_order_id = ?
                 ORDER BY gp.is_creator DESC, gp.date_joined ASC`,
                [groupId]
            );

            return res.json({
                success: true,
                participants
            });

        } catch (error) {
            console.error('Customer participants error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to load participants.'
            });
        }
    }
);
 
app.get(
    '/api/admin/statistics',
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const [groupStats] = await db.query(
                `SELECT
                    COUNT(*) AS totalGroups,

                    SUM(
                        CASE
                            WHEN admin_status = 'Pending'
                            THEN 1 ELSE 0
                        END
                    ) AS pendingGroups,

                    SUM(
                        CASE
                            WHEN admin_status = 'Approved'
                            THEN 1 ELSE 0
                        END
                    ) AS approvedGroups,

                    SUM(
                        CASE
                            WHEN admin_status = 'Rejected'
                            THEN 1 ELSE 0
                        END
                    ) AS rejectedGroups

                FROM group_orders`
            );

            const [customerStats] = await db.query(
                `SELECT COUNT(*) AS totalCustomers
                 FROM users
                 WHERE LOWER(role) = 'customer'`
            );

            const [stationStats] = await db.query(
                `SELECT COUNT(*) AS totalStations
                 FROM (
                    SELECT MIN(id)
                    FROM water_stations
                    GROUP BY name, address
                 ) AS unique_stations`
            );

            res.json({
                success: true,
                statistics: {
                    totalGroups: Number(groupStats[0].totalGroups || 0),
                    pendingGroups: Number(groupStats[0].pendingGroups || 0),
                    approvedGroups: Number(groupStats[0].approvedGroups || 0),
                    rejectedGroups: Number(groupStats[0].rejectedGroups || 0),
                    totalCustomers: Number(customerStats[0].totalCustomers || 0),
                    totalStations: Number(stationStats[0].totalStations || 0)
                }
            });

        } catch (error) {
            console.error('Admin statistics error:', error);

            res.status(500).json({
                success: false,
                message: 'Unable to load dashboard statistics.'
            });
        }
    }
); 
app.get(
    '/api/admin/group-orders/:id/participants',
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const groupId = Number(req.params.id);

            if (!Number.isInteger(groupId) || groupId < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid group order ID.'
                });
            }

            const [participants] = await db.query(
                `SELECT
                    gp.id,
                    gp.reference_id,
                    gp.quantity,
                    gp.price,
                    gp.status,
                    gp.is_creator,
                    gp.date_joined,
                    u.fullname,
                    u.email
                FROM group_participants gp
                INNER JOIN users u
                    ON gp.user_id = u.id
                WHERE gp.group_order_id = ?
                ORDER BY gp.is_creator DESC, gp.date_joined ASC`,
                [groupId]
            );

            res.json({
                success: true,
                participants
            });

        } catch (error) {
            console.error('Admin participants error:', error);

            res.status(500).json({
                success: false,
                message: 'Unable to load participant details.'
            });
        }
    }
);
 

app.patch(
    '/api/admin/group-orders/:id/status',
    verifyToken,
    verifyAdmin,
    async (req, res) => {

        let connection;

        try {
            const groupId = Number(req.params.id);
            const action = String(req.body.action || '').toLowerCase();

            if (!Number.isInteger(groupId) || groupId < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid group order ID.'
                });
            }

            if (!['approve', 'reject'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action.'
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [groups] = await connection.query(
                `SELECT id, status, admin_status
                 FROM group_orders
                 WHERE id = ?
                 FOR UPDATE`,
                [groupId]
            );

            if (groups.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Group order not found.'
                });
            }

            const newStatus =
                action === 'approve' ? 'Completed' : 'Rejected';

            const newAdminStatus =
                action === 'approve' ? 'Approved' : 'Rejected';

             await connection.query(
                `UPDATE group_orders
                 SET status = ?,
                     admin_status = ?,
                     admin_last_updated = NOW()
                 WHERE id = ?`,
                [newStatus, newAdminStatus, groupId]
            );

             await connection.query(
                `UPDATE group_participants
                 SET status = ?
                 WHERE group_order_id = ?`,
                [newStatus, groupId]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: action === 'approve'
                    ? 'Order approved successfully.'
                    : 'Order rejected successfully.',
                status: newStatus,
                adminStatus: newAdminStatus
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error('Admin status update error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to update order status.'
            });

        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);


app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.',
        path: req.originalUrl
    });
}); 

app.use((req, res) => {
    res.status(404).send('Page not found.');
});
 

async function startServer() {
    try {
        await db.query('SELECT 1');

        console.log('Database connected.');

        await seedAdmin();

       app.listen(PORT, '0.0.0.0', () => {
    console.log('BULAN WATER WATCH');
    console.log(`Website: http://localhost:${PORT}`);
    console.log(`Network: http://YOUR-PC-IP:${PORT}`);
    console.log(`Homepage: http://localhost:${PORT}/index.html`);
    console.log('Database: Connected');
});
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();
