
CREATE TABLE tag_types(
    id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
    uuid TEXT UNIQUE DEFAULT (lower(hex( randomblob(4)) || '-' || hex( randomblob(2)) || '-' || '4' || substr( hex( randomblob(2)), 2)
    || '-' || substr('AB89', 1 + (abs(random()) % 4) , 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) ) NOT NULL ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    name TEXT UNIQUE NOT NULL
);
CREATE TRIGGER tag_types_updated_at AFTER UPDATE ON tag_types WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
    UPDATE tag_types SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;


CREATE TABLE tags(
    id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
    uuid TEXT UNIQUE DEFAULT (lower(hex( randomblob(4)) || '-' || hex( randomblob(2)) || '-' || '4' || substr( hex( randomblob(2)), 2)
    || '-' || substr('AB89', 1 + (abs(random()) % 4) , 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) ) NOT NULL ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
    name TEXT UNIQUE NOT NULL ,
    original TEXT ,
    tag_type_id INTEGER ,
    parent_tag INTEGER ,
    FOREIGN KEY (tag_type_id) REFERENCES tag_types (id) ON DELETE CASCADE ,
    FOREIGN KEY (parent_tag) REFERENCES tags (id) ON DELETE SET NULL
);
CREATE TRIGGER tags_updated_at AFTER UPDATE ON tags WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
    UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
