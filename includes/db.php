<?php
/* ==========================================================================
   DATABASE
   ==========================================================================
   One PDO handle, created on first use, plus the schema that creates itself.

   WHY THE SCHEMA IS BUILT IN CODE
   There is no migration tool here and no shell on the host this ships to.
   sg_db() runs CREATE TABLE IF NOT EXISTS on every request, which costs a
   fraction of a millisecond and means uploading the folder IS the install —
   nobody has to remember to import a .sql file, and a table added in a later
   version appears the first time the new code runs.

   WHY THE SCHEMA IS WRITTEN ONCE WITH TOKENS
   SQLite and MySQL disagree about exactly three things that matter here:
   auto-increment keys, how long a string column may be before it can carry a
   default or an index, and the table suffix. Writing the schema out twice
   guarantees the two copies drift apart the first time a column is added to
   one of them. The tokens below ({PK}, {STR}, {INT}, {TBLOPT}) are expanded
   per driver instead, so there is only ever one definition to edit.
   ========================================================================== */

function sg_config($key = null, $default = null) {
    static $cfg = null;
    if ($cfg === null) $cfg = require __DIR__ . '/config.php';
    if ($key === null) return $cfg;
    return array_key_exists($key, $cfg) ? $cfg[$key] : $default;
}

/* the site root — one level above includes/ */
function sg_root() { return dirname(__DIR__); }

function sg_driver() {
    $db = sg_config('db');
    return (isset($db['driver']) && $db['driver'] === 'mysql') ? 'mysql' : 'sqlite';
}

/* --------------------------------------------------------------------------
   Keeping the database folder off the web
   --------------------------------------------------------------------------
   data/.htaccess is what stops Apache serving data/content.sqlite to anyone
   who asks for it by name. That file holds every administrator's password
   hash and every note a visitor has sent, so serving it is the worst single
   thing this project can do.

   The rule used to live only in a .htaccess committed to the repository, and
   that turned out not to be enough: the folder is created at runtime, is in
   .gitignore, and does not survive being deleted and recreated — which is
   exactly what happens when somebody clears the database, restores a backup,
   or copies the site without hidden files (a very common FTP default). The
   protection then silently disappears while everything still works, which is
   the worst possible failure shape.

   So it is rewritten here on every connection instead. It costs one is_file()
   on the hot path, and it means the guard cannot go missing without the code
   that needs it also being gone.
   -------------------------------------------------------------------------- */

function sg_guard_dir($dir) {
    $file = rtrim($dir, '/\\') . '/.htaccess';
    if (is_file($file)) return;

    $rules = "# Written automatically by includes/db.php. Do not delete.\n"
           . "# This folder holds the SQLite database: every admin password hash and\n"
           . "# every note a visitor has sent. Apache serves .sqlite as a plain file,\n"
           . "# so without this a GET for data/content.sqlite downloads the lot.\n"
           . "<IfModule mod_authz_core.c>\n"
           . "    Require all denied\n"
           . "</IfModule>\n"
           . "<IfModule !mod_authz_core.c>\n"
           . "    Order allow,deny\n"
           . "    Deny from all\n"
           . "</IfModule>\n";

    @file_put_contents($file, $rules);

    /* A host that ignores .htaccess entirely (AllowOverride None, nginx) gets
       no protection from the file above and no warning either. Say so in the
       log once, so it is discoverable without a penetration test. */
    if (!is_file($file)) {
        error_log('sg: could not write ' . $file . ' — the database directory may be '
            . 'downloadable over HTTP. Move data/ outside the web root, or deny it in '
            . 'the server config.');
    }
}

/* --------------------------------------------------------------------------
   The handle
   -------------------------------------------------------------------------- */

function sg_db() {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $db  = sg_config('db');
    $opt = array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    );

    if (sg_driver() === 'mysql') {
        $dsn = 'mysql:host=' . $db['host'] . ';port=' . (int) $db['port']
             . ';dbname=' . $db['name'] . ';charset=' . (isset($db['charset']) ? $db['charset'] : 'utf8mb4');
        $pdo = new PDO($dsn, $db['user'], $db['pass'], $opt);
    } else {
        /* A missing pdo_sqlite is the one failure that reads like a bug in
           this file rather than a missing extension. Say which it is. */
        if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
            throw new RuntimeException(
                'PHP has no pdo_sqlite driver. Enable extension=pdo_sqlite in php.ini, '
                . 'or point includes/config.local.php at MySQL instead.');
        }

        $file = $db['file'];
        $dir  = dirname($file);
        if (!is_dir($dir)) @mkdir($dir, 0775, true);

        sg_guard_dir($dir);

        $pdo = new PDO('sqlite:' . $file, null, null, $opt);

        /* WAL lets the website read while the panel writes instead of both
           queueing on one lock; busy_timeout stops a concurrent publish from
           failing outright the moment two people save at once. */
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA busy_timeout = 5000');
    }

    sg_migrate($pdo);
    return $pdo;
}

/* --------------------------------------------------------------------------
   The schema
   -------------------------------------------------------------------------- */

function sg_schema_sql() {
    return array(

        /* ---- who may sign in to the panel ----------------------------- */
        'sg_users' => "CREATE TABLE IF NOT EXISTS sg_users (
            id            {PK},
            username      {STR} NOT NULL,
            password_hash {TXT} NOT NULL,
            full_name     {STR} NOT NULL DEFAULT '',
            email         {STR} NOT NULL DEFAULT '',
            role          {STR} NOT NULL DEFAULT 'editor',
            is_active     {INT} NOT NULL DEFAULT 1,
            created_at    {STR} NOT NULL DEFAULT '',
            last_login_at {STR} NOT NULL DEFAULT '',
            UNIQUE (username)
        ){TBLOPT}",

        /* ---- news.html ------------------------------------------------ */
        'sg_news' => "CREATE TABLE IF NOT EXISTS sg_news (
            id           {PK},
            title        {STR} NOT NULL,
            category     {STR} NOT NULL DEFAULT 'Announcement',
            summary      {TXT},
            body         {TXT},
            image        {TXT},
            link_url     {TXT},
            published_on {STR} NOT NULL DEFAULT '',
            is_published {INT} NOT NULL DEFAULT 1,
            sort_order   {INT} NOT NULL DEFAULT 0,
            created_at   {STR} NOT NULL DEFAULT '',
            updated_at   {STR} NOT NULL DEFAULT ''
        ){TBLOPT}",

        /* ---- gallery.html --------------------------------------------- */
        'sg_gallery' => "CREATE TABLE IF NOT EXISTS sg_gallery (
            id           {PK},
            title        {STR} NOT NULL,
            caption      {TXT},
            image        {TXT},
            is_published {INT} NOT NULL DEFAULT 1,
            sort_order   {INT} NOT NULL DEFAULT 0,
            created_at   {STR} NOT NULL DEFAULT '',
            updated_at   {STR} NOT NULL DEFAULT ''
        ){TBLOPT}",

        /* ---- our_credentials.html -------------------------------------
           The certificate scans on the credentials page. Same shape as the
           gallery — a picture, the line printed across its foot, and an
           optional longer caption for the lightbox — because they are the
           same kind of thing to whoever maintains them, and one shape means
           one set of habits to learn.                                     */
        'sg_certificates' => "CREATE TABLE IF NOT EXISTS sg_certificates (
            id           {PK},
            title        {STR} NOT NULL,
            caption      {TXT},
            image        {TXT},
            is_published {INT} NOT NULL DEFAULT 1,
            sort_order   {INT} NOT NULL DEFAULT 0,
            created_at   {STR} NOT NULL DEFAULT '',
            updated_at   {STR} NOT NULL DEFAULT ''
        ){TBLOPT}",

        /* ---- the feedback postbag, and the About page section ----------
           Everything the website form collects lands here as 'pending'.
           Only rows an administrator has moved to 'approved' are published,
           so a stranger cannot put their own text on the About page.     */
        'sg_feedback' => "CREATE TABLE IF NOT EXISTS sg_feedback (
            id            {PK},
            feedback_type {STR} NOT NULL DEFAULT 'Visitors',
            name          {STR} NOT NULL,
            designation   {STR} NOT NULL DEFAULT '',
            mobile        {STR} NOT NULL DEFAULT '',
            note          {TXT},
            initials      {STR} NOT NULL DEFAULT '',
            status        {STR} NOT NULL DEFAULT 'pending',
            source        {STR} NOT NULL DEFAULT 'website',
            sort_order    {INT} NOT NULL DEFAULT 0,
            ip            {STR} NOT NULL DEFAULT '',
            submitted_at  {STR} NOT NULL DEFAULT '',
            reviewed_at   {STR} NOT NULL DEFAULT '',
            reviewed_by   {STR} NOT NULL DEFAULT ''
        ){TBLOPT}",

        /* ---- one row per thing the code needs to remember -------------
           Today that is only which sections have had their first-run content
           copied in; it is a key/value table rather than a seeded_at column
           so the next such flag does not need a migration.               */
        'sg_meta' => "CREATE TABLE IF NOT EXISTS sg_meta (
            k {STR} NOT NULL,
            v {TXT},
            UNIQUE (k)
        ){TBLOPT}",

        /* ---- failed sign-ins, for the throttle ------------------------ */
        'sg_login_log' => "CREATE TABLE IF NOT EXISTS sg_login_log (
            id       {PK},
            ip       {STR} NOT NULL DEFAULT '',
            username {STR} NOT NULL DEFAULT '',
            at       {INT} NOT NULL DEFAULT 0
        ){TBLOPT}",
    );
}

function sg_migrate(PDO $pdo) {
    static $done = false;
    if ($done) return;
    $done = true;

    $sub = sg_driver() === 'mysql'
        ? array('{PK}'  => 'INT AUTO_INCREMENT PRIMARY KEY',
                '{STR}' => 'VARCHAR(191)',
                '{TXT}' => 'TEXT',
                '{INT}' => 'INT',
                '{TBLOPT}' => ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4')
        : array('{PK}'  => 'INTEGER PRIMARY KEY AUTOINCREMENT',
                '{STR}' => 'TEXT',
                '{TXT}' => 'TEXT',
                '{INT}' => 'INTEGER',
                '{TBLOPT}' => '');

    foreach (sg_schema_sql() as $sql) {
        $pdo->exec(strtr($sql, $sub));
    }

    /* Indexes are separate statements and cheap to re-issue. MySQL before 8.0
       has no CREATE INDEX IF NOT EXISTS, so a duplicate there is an error and
       is the expected outcome on every request after the first. */
    $idx = array(
        'CREATE INDEX IF NOT EXISTS sg_news_pub  ON sg_news (is_published, published_on)',
        'CREATE INDEX IF NOT EXISTS sg_gal_pub   ON sg_gallery (is_published, sort_order)',
        'CREATE INDEX IF NOT EXISTS sg_cert_pub  ON sg_certificates (is_published, sort_order)',
        'CREATE INDEX IF NOT EXISTS sg_fb_status ON sg_feedback (status, sort_order)',
        'CREATE INDEX IF NOT EXISTS sg_login_at  ON sg_login_log (at)',
    );
    foreach ($idx as $sql) {
        try { $pdo->exec($sql); } catch (PDOException $e) { /* already there */ }
    }

    sg_seed($pdo);
}

/* --------------------------------------------------------------------------
   First-run content
   --------------------------------------------------------------------------
   The gallery and the About page are not empty today: six photographs and
   four recorded comments are written into that markup by hand. From the first
   publish onward, whatever is in these tables IS the page — so an empty table
   would silently delete content that has been live for years.

   Seeding copies what those pages already show into the database once, so the
   first publish changes nothing visible and every item is then editable.

   ONCE MEANS ONCE, AND THAT NEEDS A FLAG
   The guard used to be "is the table empty", which is not the same question.
   Emptying a section on purpose — six old certificate scans replaced by this
   year's, deleted before the new ones are uploaded — left the table empty,
   and the next request read that as a fresh installation and put all six
   back. Delete has to mean delete, so what is recorded is that the copying
   HAPPENED, in sg_meta, not what the table looks like now.

   The flag is written on the first run whether or not anything was inserted.
   An installation upgrading to this code already has its rows, gets the flag
   without a second copy, and is never seeded again.
   -------------------------------------------------------------------------- */

function sg_seeded(PDO $pdo, $key) {
    $st = $pdo->prepare('SELECT v FROM sg_meta WHERE k = ?');
    $st->execute(array('seeded_' . $key));
    return $st->fetchColumn() !== false;
}

function sg_mark_seeded(PDO $pdo, $key) {
    /* INSERT ... ON CONFLICT is spelled differently on the two drivers and
       this runs at most once per section, so a plain guarded insert is worth
       more than a clever one-liner. The race is two first requests arriving
       together; UNIQUE (k) settles it and the loser is ignored. */
    try {
        $st = $pdo->prepare('INSERT INTO sg_meta (k, v) VALUES (?, ?)');
        $st->execute(array('seeded_' . $key, date('Y-m-d H:i:s')));
    } catch (PDOException $e) { /* already flagged by a concurrent request */ }
}

function sg_seed(PDO $pdo) {
    $now = date('Y-m-d H:i:s');

    $count = function ($t) use ($pdo) {
        return (int) $pdo->query('SELECT COUNT(*) FROM ' . $t)->fetchColumn();
    };

    if (!sg_seeded($pdo, 'gallery')) {
        if ($count('sg_gallery') === 0) {
            $rows = array(
                array('Primary Cutting Zone', 'images/gallery/1.jpg'),
                array('Beaching',             'images/gallery/2.jpg'),
                array('Block Handling',       'images/gallery/3.jpg'),
                array('Plate Recovery',       'images/gallery/4.jpg'),
                array('Secondary Cutting',    'images/gallery/5.jpg'),
                array('Yard Overview',        'images/gallery/6.jpg'),
            );
            $st = $pdo->prepare('INSERT INTO sg_gallery
                (title, caption, image, is_published, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?, ?)');
            foreach ($rows as $i => $r) {
                $st->execute(array($r[0], '', $r[1], ($i + 1) * 10, $now, $now));
            }
        }
        sg_mark_seeded($pdo, 'gallery');
    }

    /* The six certificate scans our_credentials.html carries by hand. Same
       reasoning as the gallery above: from the first publish the table IS the
       section, so an empty one would delete six live cards. */
    if (!sg_seeded($pdo, 'certificates')) {
        if ($count('sg_certificates') === 0) {
            $st = $pdo->prepare('INSERT INTO sg_certificates
                (title, caption, image, is_published, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?, ?)');
            for ($i = 1; $i <= 6; $i++) {
                $label = 'Certificate ' . str_pad((string) $i, 2, '0', STR_PAD_LEFT);
                $st->execute(array($label, '', 'images/cert/' . $i . '.jpg', $i * 10, $now, $now));
            }
        }
        sg_mark_seeded($pdo, 'certificates');
    }

    if (!sg_seeded($pdo, 'feedback')) {
        if ($count('sg_feedback') === 0) {
            $rows = array(
                array('NYK Ship Management', 'NYK',
                      'Generally found good infrastructure for ship recycling Which is good initiative for facility management'),
                array('Class NK', 'NK',
                      'Team\'s attitude to obtain knowledge is very good. Please keep obtaining knowledge.'),
                array('JNA, Japan', 'JNA',
                      'Yard is well developed. Safety and Environment friendly operation is good. Hope to see next upgrading.'),
                array('Keiji Tomoda, Japan', 'KT',
                      'We are impressed that well managed good yard & Nice idea like Floating Platform.'),
            );
            $st = $pdo->prepare('INSERT INTO sg_feedback
                (feedback_type, name, designation, mobile, note, initials, status, source,
                 sort_order, ip, submitted_at, reviewed_at, reviewed_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($rows as $i => $r) {
                $st->execute(array('Visitors', $r[0], '', '', $r[2], $r[1],
                    'approved', 'admin', ($i + 1) * 10, '', $now, $now, 'seed'));
            }
        }
        sg_mark_seeded($pdo, 'feedback');
    }
}

/* --------------------------------------------------------------------------
   Small query helpers
   -------------------------------------------------------------------------- */

function sg_all($sql, $args = array()) {
    $st = sg_db()->prepare($sql);
    $st->execute($args);
    return $st->fetchAll();
}

function sg_one($sql, $args = array()) {
    $st = sg_db()->prepare($sql);
    $st->execute($args);
    $row = $st->fetch();
    return $row === false ? null : $row;
}

function sg_run($sql, $args = array()) {
    $st = sg_db()->prepare($sql);
    $st->execute($args);
    return $st;
}

function sg_val($sql, $args = array(), $default = null) {
    $st = sg_db()->prepare($sql);
    $st->execute($args);
    $v = $st->fetchColumn();
    return $v === false ? $default : $v;
}
