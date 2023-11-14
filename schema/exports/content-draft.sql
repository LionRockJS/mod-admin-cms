
CREATE TABLE pages(
    id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
    uuid TEXT UNIQUE DEFAULT (lower(hex( randomblob(4)) || '-' || hex( randomblob(2)) || '-' || '4' || substr( hex( randomblob(2)), 2)
    || '-' || substr('AB89', 1 + (abs(random()) % 4) , 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) ) NOT NULL ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    name TEXT NOT NULL ,
    slug TEXT UNIQUE NOT NULL ,
    weight INTEGER DEFAULT 5 ,
    start DATETIME ,
    end DATETIME ,
    page_type TEXT ,
    current_page_version_id INTEGER ,
    original TEXT
);
CREATE TRIGGER pages_updated_at AFTER UPDATE ON pages WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
    UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;


CREATE TABLE page_tags(
    id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
    uuid TEXT UNIQUE DEFAULT (lower(hex( randomblob(4)) || '-' || hex( randomblob(2)) || '-' || '4' || substr( hex( randomblob(2)), 2)
    || '-' || substr('AB89', 1 + (abs(random()) % 4) , 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) ) NOT NULL ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    page_id INTEGER ,
    tag_id INTEGER NOT NULL ,
    weight INTEGER DEFAULT 5 ,
    FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE
);
CREATE TRIGGER page_tags_updated_at AFTER UPDATE ON page_tags WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
    UPDATE page_tags SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;


CREATE TABLE page_keywords(
    id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
    uuid TEXT UNIQUE DEFAULT (lower(hex( randomblob(4)) || '-' || hex( randomblob(2)) || '-' || '4' || substr( hex( randomblob(2)), 2)
    || '-' || substr('AB89', 1 + (abs(random()) % 4) , 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) ) NOT NULL ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    language_code TEXT NOT NULL ,
    name TEXT NOT NULL ,
    keywords TEXT NOT NULL ,
    page_id INTEGER ,
    FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE
);
CREATE TRIGGER page_keywords_updated_at AFTER UPDATE ON page_keywords WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
    UPDATE page_keywords SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
