let express = require("express");

const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

let app = express();
// More explicit CORS configuration
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://otome-haven.vercel.app',
        'https://otome-haven-*.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Explicitly handle OPTIONS requests
app.options('*', cors());
app.use(express.json());

const DATABASE_URL = process.env.VITE_DATABASE_URL;

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function getPostgresVersion() {
    const client = await pool.connect();
    try {
        const result = await client.query("SELECT version()");
        console.log(result.rows);
    } catch (error) {
        console.error(error);
    }
}

getPostgresVersion();

//-----------------------------
//            Games
//-----------------------------
//get all games by user id
app.get("/games/:id", async (req, res) => {
    const client = await pool.connect();
    const { id } = req.params;
    try {
        const result = await client.query(
            "SELECT * FROM games WHERE user_id = $1",
            [id],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "All games retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No games registered for this account",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get single game by id
app.get("/games/single/:id", async (req, res) => {
    const client = await pool.connect();
    const { id } = req.params;
    try {
        const result = await client.query("SELECT * FROM games WHERE id = $1", [
            id,
        ]);
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Game retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No game found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//add new game
app.post("/games/:id", async (req, res) => {
    const client = await pool.connect();
    const { id } = req.params;
    const { name, developer, genre, platform, synopsis, rating } = req.body;
    try {
        //check if game already exist
        const gameExist = await client.query(
            "SELECT * FROM games WHERE name = $1 AND user_id = $2",
            [name, id],
        );

        if (!gameExist.rows.length > 0) {
            const result = await client.query(
                "INSERT INTO games (name, developer, genre, platform, synopsis, rating, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
                [name, developer, genre, platform, synopsis, rating, id],
            );
            res.json({
                status: "success",
                data: result.rows,
                message: "New game added successfully",
            });
        } else {
            res.json({
                status: "failed",
                message: " Game already exists",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//delete game by id
app.delete("/games/:id", async (req, res) => {
    const client = await pool.connect();
    const { id } = req.params;
    try {
        //get all characters by game id
        const characters = await client.query(
            "SELECT id FROM characters WHERE game_id = $1",
            [id],
        );

        //if there is characters
        if (characters.rows.length > 0) {
            //check if the characters have choices
            const choices = await client.query(
                "SELECT id FROM choices WHERE character_id = ANY($1)",
                [characters.rows.map((row) => row.id)],
            );

            //if there are choices in those characters
            if (choices.rows.length > 0) {
                //delete routes with the choice ids
                await client.query("DELETE FROM routes WHERE choice_id = ANY($1)", [
                    choices.rows.map((row) => row.id),
                ]);
                //delete choices with the char ids
                await client.query("DELETE FROM choices WHERE character_id = ANY($1)", [
                    characters.rows.map((row) => row.id),
                ]);
            }

            //delete characters with the game id
            await client.query("DELETE FROM characters WHERE game_id = $1", [id]);
        }

        const result = await client.query("DELETE FROM games WHERE id = $1", [id]);
        res.json({
            status: "success",
            message: "Game deleted successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//update games by id
app.put("/games/:id", async (req, res) => {
    const client = await pool.connect();
    const { id } = req.params;
    const { developer, genre, platform, synopsis, rating } = req.body;
    try {
        const result = await client.query(
            "UPDATE games SET developer = $1, genre = $2, platform = $3, synopsis = $4, rating = $5 WHERE id = $6 RETURNING *",
            [developer, genre, platform, synopsis, rating, id],
        );
        res.json({
            status: "success",
            data: result.rows,
            message: "Game updated successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//-----------------------------
//         Characters
//-----------------------------
//get all characters by game id
app.get("/characters/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM characters WHERE game_id = $1",
            [id],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Characters retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No characters have been added yet",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get character by id
app.get("/characters/single/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM characters WHERE id = $1",
            [id],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Character retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No character found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//add new character
app.post("/characters/:id", async (req, res) => {
    const { id } = req.params;
    const { name, voice_actor, personality, review, rating } = req.body;
    const client = await pool.connect();
    try {
        //check if character with username already exists
        const characterExist = await client.query(
            "SELECT * FROM characters WHERE name = $1 AND game_id = $2",
            [name, id],
        );

        if (!characterExist.rows.length > 0) {
            const result = await client.query(
                "INSERT INTO characters (name, voice_actor, personality, review, rating, game_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
                [name, voice_actor, personality, review, rating, id],
            );
            res.json({
                status: "success",
                data: result.rows[0],
                message: "New character added successfully",
            });
        } else {
            res.json({
                status: "failed",
                message: "Character already exists",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//update game by game id
app.put(`/characters/:id`, async (req, res) => {
    const { id } = req.params;
    const { voice_actor, personality, review, rating } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "UPDATE characters SET voice_actor = $1, personality = $2, review = $3, rating = $4 WHERE id = $5 RETURNING *",
            [voice_actor, personality, review, rating, id],
        );
        res.json({
            status: "success",
            data: result.rows[0],
            message: "Character updated successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//delete character by id
app.delete("/characters/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        //get all choices by char id
        const choices = await client.query(
            "SELECT id FROM choices WHERE character_id = $1",
            [id],
        );

        //if char id has some routes
        if (choices.rows.length > 0) {
            //delete routes with the choice ids
            await client.query("DELETE FROM routes WHERE choice_id = ANY($1)", [
                choices.rows.map((row) => row.id),
            ]);
            //delete choices with the char id
            await client.query("DELETE FROM choices WHERE character_id = $1", [id]);
        }

        //delete character
        const result = await client.query("DELETE FROM characters WHERE id = $1", [
            id,
        ]);
        res.json({
            status: "success",
            message: "Character deleted successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//---------------------------------------
// Tracker: Chapters / Choices
//---------------------------------------
//add new chapter to character
app.post("/chapter/:id", async (req, res) => {
    const { id } = req.params;
    const { chapter, description } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "INSERT INTO choices (chapter, description, sequence, character_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [chapter, description, 1, id],
        );
        res.json({
            status: "success",
            data: result.rows,
            message: "New chapter added successfully",
        });

        //assign ending to the chapter / choice (associative table)
        const ending = await client.query(
            "INSERT INTO routes (choice_id, ending_id) VALUES ($1, $2) RETURNING *",
            [result.rows[0].id, 7],
        );
        res.json({
            status: "success",
            data: ending.rows,
            message: "Route created successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//add new description to chapter
app.post("/chapter/description/:id", async (req, res) => {
    const { id } = req.params;
    const { description, chapter } = req.body;
    const client = await pool.connect();
    try {
        //get latest sequence number
        const lastNum = await client.query(
            "SELECT MAX(sequence) FROM choices WHERE chapter = $1 AND character_id = $2",
            [chapter, id],
        );

        //add new description
        const result = await client.query(
            "INSERT INTO choices (chapter, description, sequence, character_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [chapter, description, lastNum.rows[0].max + 1, id],
        );

        //add new route
        const route = await client.query(
            "INSERT INTO routes (choice_id, ending_id) VALUES ($1, $2) RETURNING *",
            [result.rows[0].id, 7],
        );

        //success message
        res.json({
            status: "success",
            data: result.rows[0],
            message: "New description added successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//update description by choice id
app.put("/chapter/description/:id", async (req, res) => {
    const { id } = req.params;
    const { description } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "UPDATE choices SET description = $1 WHERE id = $2 RETURNING *",
            [description, id],
        );
        res.json({
            status: "success",
            data: result.rows[0],
            message: "Description updated successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//delete chapter by character id
app.delete("/chapter/:id/:chapter", async (req, res) => {
    const { id, chapter } = req.params;
    const client = await pool.connect();
    try {
        //get choice ids of the chapter
        const choiceIds = await client.query(
            "SELECT id FROM choices WHERE character_id = $1 AND chapter = $2",
            [id, chapter],
        );

        //delete routes of the chapter
        await client.query("DELETE FROM routes WHERE choice_id = ANY($1)", [
            choiceIds.rows.map((row) => row.id),
        ]);

        //delete chapter
        const result = await client.query(
            "DELETE FROM choices WHERE chapter = $1 AND character_id = $2",
            [chapter, id],
        );
        res.json({
            status: "success",
            message: "Chapter deleted successfully",
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//-------------------------------
//     Tracker: Routes
//-------------------------------
//assign ending to default route
app.put("/routes/:id/:endingId", async (req, res) => {
    const { id, endingId } = req.params;
    const client = await pool.connect();
    try {
        //get all choice ids by char id
        const choiceIds = await client.query(
            "SELECT id FROM choices WHERE character_id = $1",
            [id],
        );

        if (choiceIds.rows.length > 0) {
            //get all types of endings
            const endings = await client.query(
                "SELECT DISTINCT(ending_id) FROM routes WHERE choice_id = ANY($1)",
                [choiceIds.rows.map((row) => row.id)],
            );
            const assignedEndings = endings.rows.map((row) => row.ending_id);

            //get all choices from default route
            const defaultRoute = await client.query(
                "SELECT id FROM routes WHERE ending_id = $1",
                [7],
            );

            if (defaultRoute.rows.length > 0) {
                if (!assignedEndings.includes(Number(endingId))) {
                    //update route
                    const result = await client.query(
                        "UPDATE routes SET ending_id = $1 WHERE id = ANY($2) RETURNING *",
                        [endingId, defaultRoute.rows.map((row) => row.id)],
                    );
                    res.json({
                        status: "success",
                        data: result.rows,
                        message: "Route updated successfully",
                    });
                } else {
                    res.json({
                        status: "failed",
                        message: "Ending already assigned to a route",
                    });
                }
            } else {
                res.json({
                    status: "failed",
                    message: "There are no routes yet",
                });
            }
        } else {
            res.json({
                status: "failed",
                message: "This character does not have any routes.",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//-------------------------------
//        Tracker: Endings
//-------------------------------
//get best ending by character id
app.get("/endings/bestend/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT choices.id, choices.chapter, choices.description, endings.name FROM choices INNER JOIN routes ON choices.id = routes.choice_id INNER JOIN endings ON endings.id = routes.ending_id WHERE choices.character_id = $1 AND endings.name = $2 ORDER BY choices.chapter, choices.sequence",
            [id, "Best Ending"],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Best ending retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No endings found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get bad ending by character id
app.get("/endings/badend/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT choices.id, choices.chapter, choices.description, endings.name FROM choices INNER JOIN routes ON choices.id = routes.choice_id INNER JOIN endings ON endings.id = routes.ending_id WHERE choices.character_id = $1 AND endings.name = $2  ORDER BY choices.chapter, choices.sequence",
            [id, "Bad Ending"],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Bad ending retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No endings found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get best friends ending by character id
app.get("/endings/bffend/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT choices.id, choices.chapter, choices.description, endings.name FROM choices INNER JOIN routes ON choices.id = routes.choice_id INNER JOIN endings ON endings.id = routes.ending_id WHERE choices.character_id = $1 AND endings.name = $2  ORDER BY choices.chapter, choices.sequence",
            [id, "Best Friends Ending"],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Best friend ending retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No endings found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get normal ending by character id
app.get("/endings/normalend/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT choices.id, choices.chapter, choices.description, endings.name FROM choices INNER JOIN routes ON choices.id = routes.choice_id INNER JOIN endings ON endings.id = routes.ending_id WHERE choices.character_id = $1 AND endings.name = $2  ORDER BY choices.chapter, choices.sequence",
            [id, "Normal Ending"],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Normal ending retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No endings found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get game over ending by character id
app.get("/endings/gameoverend/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT choices.id, choices.chapter, choices.description, endings.name FROM choices INNER JOIN routes ON choices.id = routes.choice_id INNER JOIN endings ON endings.id = routes.ending_id WHERE choices.character_id = $1 AND endings.name = $2  ORDER BY choices.chapter, choices.sequence",
            [id, "Game Over / Death Ending"],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Game over ending retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No endings found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get unrequired love ending by character id
app.get("/endings/unrequitedloveend/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT choices.id, choices.chapter, choices.description, endings.name FROM choices INNER JOIN routes ON choices.id = routes.choice_id INNER JOIN endings ON endings.id = routes.ending_id WHERE choices.character_id = $1 AND endings.name = $2  ORDER BY choices.chapter, choices.sequence",
            [id, "Unrequited Love Ending"],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Unrequired Love ending retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No endings found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

//get default ending by character id
app.get("/endings/defaultend/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT choices.id, choices.chapter, choices.description, endings.name FROM choices INNER JOIN routes ON choices.id = routes.choice_id INNER JOIN endings ON endings.id = routes.ending_id WHERE choices.character_id = $1 AND endings.name = $2  ORDER BY choices.chapter, choices.sequence",
            [id, "Not Decided"],
        );
        if (result.rows.length > 0) {
            res.json({
                status: "success",
                data: result.rows,
                message: "Default ending retrieved successfully",
            });
        } else {
            res.json({
                status: "success",
                message: "No endings found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(5000, () => {
    console.log("Express server initialized");
});
