-- MetaSeek Seed Data for Local Simulation & Testing

-- 1. Insert Default Sources
INSERT OR REPLACE INTO sources (id, source_key, name, type, enabled, priority, health_score, avg_latency, circuit_state) VALUES
(1, 'pan_index', '网盘公开索引聚合', 'api', 1, 90, 0.98, 185, 'closed'),
(2, 'magnet_index', '磁力与种子聚合网络', 'torznab', 1, 95, 0.99, 210, 'closed'),
(3, 'tg_channel', 'Telegram 资源频道推送', 'telegram', 1, 75, 0.92, 420, 'closed'),
(4, 'aliyun_hub', '阿里云盘资源社群', 'html', 1, 80, 0.94, 290, 'closed'),
(5, 'quark_share', '夸克资源分享站', 'api', 1, 85, 0.96, 230, 'closed'),
(6, '115_vip_archive', '115 VIP 资源库', 'api', 1, 88, 0.95, 310, 'closed'),
(7, 'btih_dht_feeder', 'BTIH 实时网络嗅探', 'custom', 1, 70, 0.89, 520, 'closed'),
(8, 'torznab_global', 'Global Torznab Feed', 'torznab', 1, 60, 0.85, 680, 'closed');

-- 2. Insert Canonical Resources (Aggregated Entities)
INSERT OR REPLACE INTO canonical_resources (id, title, original_title, category, year, resolution, codec, audio, edition, normalized_key, created_at, updated_at) VALUES
('canon-wandering-earth-2-4k-remux', '流浪地球2', 'the wandering earth ii', 'movie', 2023, '2160p', 'HEVC', 'TrueHD 7.1 Atmos', 'REMUX', 'key_wandering_earth_2_4k', 1704067200000, 1704067200000),
('canon-wandering-earth-2-1080p', '流浪地球2', 'the wandering earth ii', 'movie', 2023, '1080p', 'AVC', 'AAC', 'BluRay', 'key_wandering_earth_2_1080p', 1704067200000, 1704067200000),
('canon-oppenheimer-4k-remux', '奥本海默', 'oppenheimer', 'movie', 2023, '2160p', 'HEVC', 'DTS-HD MA 5.1', 'REMUX', 'key_oppenheimer_4k', 1704067200000, 1704067200000),
('canon-interstellar-4k-imax', '星际穿越', 'interstellar', 'movie', 2014, '2160p', 'HEVC', 'DTS-HD MA 5.1', 'IMAX', 'key_interstellar_4k', 1704067200000, 1704067200000),
('canon-dune-2-4k-remux', '沙丘2', 'dune part two', 'movie', 2024, '2160p', 'HEVC', 'TrueHD 7.1 Atmos', 'REMUX', 'key_dune_2_4k', 1704067200000, 1704067200000),
('canon-black-myth-wukong-pc', '黑神话：悟空', 'black myth wukong', 'game', 2024, NULL, NULL, NULL, 'Deluxe', 'key_black_myth_pc', 1704067200000, 1704067200000),
('canon-blossoms-shanghai-4k', '繁花', 'blossoms shanghai', 'tv', 2023, '2160p', 'HEVC', 'AAC', 'WEB-DL', 'key_blossoms_shanghai', 1704067200000, 1704067200000),
('canon-joy-of-life-2-4k', '庆余年 第二季', 'joy of life season 2', 'tv', 2024, '2160p', 'HEVC', 'AAC', 'WEB-DL', 'key_joy_of_life_2', 1704067200000, 1704067200000),
('canon-vscode-portable-win', 'Visual Studio Code 便携版', 'visual studio code portable', 'software', 2024, NULL, NULL, NULL, 'v1.96', 'key_vscode_portable', 1704067200000, 1704067200000),
('canon-photoshop-2024-win', 'Adobe Photoshop 2024 v25', 'adobe photoshop 2024', 'software', 2024, NULL, NULL, NULL, 'v25.11', 'key_ps_2024', 1704067200000, 1704067200000);

-- 3. Insert Multi-Source Resources
-- 流浪地球2 4K REMUX 来源
INSERT OR REPLACE INTO resources (id, canonical_id, title, normalized_title, resource_type, provider, url, url_hash, infohash, password, size_bytes, file_count, source_id, published_at, discovered_at, last_seen_at, status, quality_score, popularity_score, metadata, created_at, updated_at) VALUES
(101, 'canon-wandering-earth-2-4k-remux', '流浪地球2.The.Wandering.Earth.II.2023.2160p.UHD.BluRay.REMUX.HEVC.DV.TrueHD.7.1.Atmos', 'the wandering earth ii 2023 2160p bluray remux', 'magnet', 'magnet', 'magnet:?xt=urn:btih:e3b0c44298fc1c149afbf4c8996fb92427ae41e4&dn=The.Wandering.Earth.II.2023', 'hash_magnet_earth2_remux', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4', NULL, 78200000000, 3, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.98, 95.0, '{"resolution":"2160p","codec":"HEVC","audio":"Atmos","edition":"REMUX"}', 1704067200000, 1704067200000),
(102, 'canon-wandering-earth-2-4k-remux', '【夸克4K原画】流浪地球2 (2023) 4K REMUX 杜比视界 国英双语 内封简繁', '流浪地球2 2023 4k remux', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_earth2_4k_remux', 'hash_quark_earth2_remux', NULL, NULL, 75400000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 92.0, '{"resolution":"2160p","edition":"REMUX"}', 1704067200000, 1704067200000),
(103, 'canon-wandering-earth-2-4k-remux', '流浪地球2 2023 4K REMUX 阿里网盘原画收藏版', '流浪地球2 2023 4k remux 阿里', 'cloud_drive', 'aliyun', 'https://www.alipan.com/s/ali_earth2_4k', 'hash_ali_earth2_remux', NULL, NULL, 76000000000, 1, 4, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 88.0, '{"resolution":"2160p","edition":"REMUX"}', 1704067200000, 1704067200000),
(104, 'canon-wandering-earth-2-4k-remux', '流浪地球2 115VIP 4K REMUX 蓝光原生无损', '流浪地球2 115 4k remux', 'cloud_drive', '115', 'https://115.com/s/115_earth2_remux', 'hash_115_earth2_remux', NULL, '115v', 78200000000, 1, 6, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 85.0, '{"resolution":"2160p","edition":"REMUX"}', 1704067200000, 1704067200000),
(105, 'canon-wandering-earth-2-4k-remux', '流浪地球2 百度网盘 4K 提取码: meta', '流浪地球2 百度 4k', 'cloud_drive', 'baidu', 'https://pan.baidu.com/s/1earth2_bd4k', 'hash_baidu_earth2_4k', NULL, 'meta', 22000000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.90, 80.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),

-- 流浪地球2 1080P 来源
(106, 'canon-wandering-earth-2-1080p', '流浪地球2.2023.1080p.BluRay.x264.DTS-HD.MA.5.1-HDChina', 'the wandering earth ii 2023 1080p bluray', 'magnet', 'magnet', 'magnet:?xt=urn:btih:a1b2c3d4e5f678901234567890abcdef12345678&dn=The.Wandering.Earth.II.1080p', 'hash_magnet_earth2_1080p', 'a1b2c3d4e5f678901234567890abcdef12345678', NULL, 15400000000, 2, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.92, 75.0, '{"resolution":"1080p","codec":"AVC"}', 1704067200000, 1704067200000),
(107, 'canon-wandering-earth-2-1080p', '流浪地球2 1080P 高清国语中字 123云盘免登录直下', '流浪地球2 1080p 123云盘', 'cloud_drive', '123pan', 'https://www.123pan.com/s/123_earth2_1080p', 'hash_123_earth2_1080p', NULL, NULL, 6800000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.91, 70.0, '{"resolution":"1080p"}', 1704067200000, 1704067200000),

-- 奥本海默 4K REMUX 来源
(201, 'canon-oppenheimer-4k-remux', 'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.HEVC.DTS-HD.MA.5.1-FGT', 'oppenheimer 2023 2160p bluray remux', 'magnet', 'magnet', 'magnet:?xt=urn:btih:b2c3d4e5f601234567890abcdef1234567890abc&dn=Oppenheimer.2023', 'hash_magnet_oppen_4k', 'b2c3d4e5f601234567890abcdef1234567890abc', NULL, 86500000000, 4, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.99, 98.0, '{"resolution":"2160p","edition":"REMUX"}', 1704067200000, 1704067200000),
(202, 'canon-oppenheimer-4k-remux', '【夸克首发】奥本海默 2023 4K REMUX 蓝光原生国英双语双字', '奥本海默 2023 4k remux 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_oppen_4k', 'hash_quark_oppen_4k', NULL, NULL, 84000000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 94.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),
(203, 'canon-oppenheimer-4k-remux', '奥本海默 4K 原盘 阿里云盘无损收藏', '奥本海默 4k 阿里云盘', 'cloud_drive', 'aliyun', 'https://www.alipan.com/s/ali_oppen_4k', 'hash_ali_oppen_4k', NULL, NULL, 85000000000, 1, 4, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 91.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),

-- 星际穿越 4K IMAX
(301, 'canon-interstellar-4k-imax', 'Interstellar.2014.IMAX.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1', 'interstellar 2014 imax 2160p', 'magnet', 'magnet', 'magnet:?xt=urn:btih:c3d4e5f601234567890abcdef1234567890abcdef&dn=Interstellar.IMAX', 'hash_magnet_interstellar', 'c3d4e5f601234567890abcdef1234567890abcdef', NULL, 42000000000, 2, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.99, 99.0, '{"resolution":"2160p","edition":"IMAX"}', 1704067200000, 1704067200000),
(302, 'canon-interstellar-4k-imax', '星际穿越 4K IMAX 国英双语 夸克网盘', '星际穿越 4k 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_interstellar', 'hash_quark_interstellar', NULL, NULL, 38000000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 96.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),

-- 沙丘2 4K
(401, 'canon-dune-2-4k-remux', 'Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.HEVC.DV.TrueHD.7.1.Atmos', 'dune part two 2024 2160p bluray remux', 'magnet', 'magnet', 'magnet:?xt=urn:btih:d4e5f601234567890abcdef1234567890abcdef12&dn=Dune.Part.Two', 'hash_magnet_dune2', 'd4e5f601234567890abcdef1234567890abcdef12', NULL, 65000000000, 3, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 96.0, '{"resolution":"2160p","edition":"REMUX"}', 1704067200000, 1704067200000),
(402, 'canon-dune-2-4k-remux', '沙丘2 (2024) 4K 杜比全景声 夸克网盘秒存', '沙丘2 2024 4k 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_dune2_4k', 'hash_quark_dune2', NULL, NULL, 28000000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 93.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),

-- 黑神话：悟空
(501, 'canon-black-myth-wukong-pc', 'Black Myth Wukong PC Deluxe Edition Full Unlocked', 'black myth wukong pc deluxe', 'torrent', 'torrent', 'https://tracker.example.com/black_myth_pc.torrent', 'hash_torrent_wukong', 'e5f601234567890abcdef1234567890abcdef1234', NULL, 128000000000, 18, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.99, 100.0, '{"category":"game"}', 1704067200000, 1704067200000),
(502, 'canon-black-myth-wukong-pc', '黑神话：悟空 豪华版免安装中文绿色版 夸克网盘高速直连', '黑神话悟空 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_wukong_pc', 'hash_quark_wukong', NULL, NULL, 128000000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 97.0, '{"category":"game"}', 1704067200000, 1704067200000),
(503, 'canon-black-myth-wukong-pc', '黑神话悟空 百度网盘 分卷解压 提取码: wukg', '黑神话悟空 百度', 'cloud_drive', 'baidu', 'https://pan.baidu.com/s/1wukong_bd', 'hash_baidu_wukong', NULL, 'wukg', 128000000000, 6, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.91, 92.0, '{"category":"game"}', 1704067200000, 1704067200000),

-- 繁花
(601, 'canon-blossoms-shanghai-4k', '繁花 (2023) S01 全30集 4K 沪语/普通话 双语 60帧 夸克', '繁花 2023 4k 全集 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_blossoms_4k', 'hash_quark_blossoms', NULL, NULL, 95000000000, 30, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 95.0, '{"resolution":"2160p","episodes":30}', 1704067200000, 1704067200000),
(602, 'canon-blossoms-shanghai-4k', '繁花 4K 沪语版 阿里云盘 高清收藏', '繁花 4k 阿里云盘', 'cloud_drive', 'aliyun', 'https://www.alipan.com/s/ali_blossoms', 'hash_ali_blossoms', NULL, NULL, 92000000000, 30, 4, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 91.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),

-- 庆余年2
(701, 'canon-joy-of-life-2-4k', '庆余年 第二季 (2024) 4K 原画 全集未删减 夸克网盘', '庆余年 第二季 2024 4k 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_joy_life_2', 'hash_quark_joy2', NULL, NULL, 88000000000, 36, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 93.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),

-- VS Code & Photoshop
(801, 'canon-vscode-portable-win', 'VSCode-win32-x64-1.96.4 Portable 官方纯净免安装版 蓝奏/123云盘', 'vscode win32 x64 portable', 'cloud_drive', '123pan', 'https://www.123pan.com/s/123_vscode_portable', 'hash_123_vscode', NULL, NULL, 120000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.98, 88.0, '{"category":"software"}', 1704067200000, 1704067200000),
(901, 'canon-photoshop-2024-win', 'Adobe Photoshop 2024 v25.11.0.706 x64 一键安装直装破解版 夸克/百度', 'adobe photoshop 2024 win x64', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_ps_2024', 'hash_quark_ps2024', NULL, NULL, 4300000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 95.0, '{"category":"software"}', 1704067200000, 1704067200000);

-- 4. Insert Torrent Files for File-Level Search
INSERT OR REPLACE INTO resource_files (id, resource_id, path, filename, extension, size_bytes) VALUES
(1, 101, '/', 'The.Wandering.Earth.II.2023.2160p.UHD.BluRay.REMUX.mkv', 'mkv', 78100000000),
(2, 101, '/', 'The.Wandering.Earth.II.2023.chs&cht.srt', 'srt', 120000),
(3, 101, '/', 'sample.mkv', 'mkv', 100000000),
(4, 201, '/', 'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.mkv', 'mkv', 86400000000),
(5, 201, '/Subtitles', 'Oppenheimer.chs.ass', 'ass', 240000),
(6, 501, '/bin', 'b1.exe', 'exe', 45000000000),
(7, 501, '/Content/Paks', 'pakchunk0-Windows.pak', 'pak', 83000000000);

-- 5. Insert Search Analytics & Trending
INSERT OR REPLACE INTO search_analytics (id, query, count, last_searched_at) VALUES
(1, '流浪地球2', 1280, 1704067200000),
(2, '奥本海默', 950, 1704067200000),
(3, '黑神话悟空', 2400, 1704067200000),
(4, '沙丘2', 880, 1704067200000),
(5, '繁花', 760, 1704067200000),
(6, 'Photoshop 2024', 650, 1704067200000);
