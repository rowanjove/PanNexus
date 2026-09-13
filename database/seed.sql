-- MetaSeek Seed Data for Local Simulation & Testing

-- 1. Insert Default Sources
INSERT OR REPLACE INTO sources (id, source_key, name, type, enabled, priority, health_score, avg_latency, circuit_state) VALUES
(1, 'nyaa_global', 'Nyaa 公开 RSS', 'rss', 1, 80, 1.0, 0, 'closed'),
(2, 'dmhy_anime', '动漫花园公开 RSS', 'rss', 1, 82, 1.0, 0, 'closed'),
(3, 'torznab_gateway', 'Torznab / Jackett 协议网关', 'torznab', 1, 92, 1.0, 0, 'closed'),
(4, 'alist_hub', 'AList 开放目录', 'api', 1, 88, 1.0, 0, 'closed'),
(5, 'tg_aliyun_4k_movies', '阿里 4K 影视频道', 'telegram', 1, 85, 1.0, 0, 'closed'),
(6, 'tg_quark_movies', '夸克影视直链频道', 'telegram', 1, 84, 1.0, 0, 'closed'),
(7, 'pan_index', '网盘公开索引聚合（未配置）', 'api', 0, 50, 1.0, 0, 'closed'),
(8, 'magnet_index', '磁力聚合（未配置）', 'torznab', 0, 50, 1.0, 0, 'closed');

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
('canon-joy-of-life-1-4k', '庆余年 第一季', 'joy of life season 1', 'tv', 2019, '2160p', 'HEVC', 'AAC', 'WEB-DL', 'key_joy_of_life_1', 1704067200000, 1704067200000),
('canon-joy-of-life-book', '庆余年 (猫腻原著精排版全集)', 'joy of life novel maoni', 'book', 2018, NULL, NULL, NULL, 'EPUB+MOBI+PDF', 'key_joy_of_life_book', 1704067200000, 1704067200000),
('canon-one-piece-anime', '海贼王 (航海王) 1080P/4K 精品收藏版', 'one piece 1080p anime', 'anime', 1999, '1080p', 'AVC', 'AAC', 'BDRip', 'key_one_piece_anime', 1704067200000, 1704067200000),
('canon-spy-family-s2', '间谍过家家 第二季 (SPY×FAMILY S02)', 'spy family season 2', 'anime', 2023, '1080p', 'AVC', 'AAC', 'BDRip', 'key_spy_family_s2', 1704067200000, 1704067200000),
('canon-three-body-book', '三体全集 (地球往事三部曲 精排版)', 'three body problem cixin liu', 'book', 2008, NULL, NULL, NULL, 'EPUB/PDF', 'key_three_body_book', 1704067200000, 1704067200000),
('canon-jay-chou-music', '周杰伦 2000-2024 经典专辑母带无损全集', 'jay chou flac lossless collection', 'music', 2024, NULL, NULL, 'FLAC/Hi-Res', 'Lossless', 'key_jay_chou_music', 1704067200000, 1704067200000),
('canon-elden-ring-game', '艾尔登法环：黄金树幽影 中文豪华免安装版', 'elden ring shadow of the erdtree', 'game', 2024, NULL, NULL, NULL, 'v1.12', 'key_elden_ring_game', 1704067200000, 1704067200000),
('canon-kaoyan-document', '2025/2026 全学科硕士考研真题与核心讲义', 'kaoyan 2025 2026 core package', 'document', 2025, NULL, NULL, NULL, 'PDF高清资料', 'key_kaoyan_document', 1704067200000, 1704067200000),
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
(108, 'canon-wandering-earth-2-4k-remux', '流浪地球2 4K REMUX 迅雷云盘 极速离线取回', '流浪地球2 迅雷 4k', 'cloud_drive', 'xunlei', 'https://pan.xunlei.com/s/xl_earth2_4k', 'hash_xl_earth2_4k', NULL, NULL, 75000000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.93, 83.0, '{"resolution":"2160p","edition":"REMUX"}', 1704067200000, 1704067200000),
(109, 'canon-wandering-earth-2-4k-remux', '流浪地球2 4K REMUX 天翼云盘 提取码: ty88', '流浪地球2 天翼 4k', 'cloud_drive', 'tianyi', 'https://cloud.189.cn/web/share?code=tianyi_earth2_4k', 'hash_tianyi_earth2_4k', NULL, 'ty88', 75000000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 85.0, '{"resolution":"2160p","edition":"REMUX"}', 1704067200000, 1704067200000),

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
(504, 'canon-black-myth-wukong-pc', '黑神话：悟空 豪华中文免安装绿色版 UC网盘极速转存', '黑神话悟空 uc网盘', 'cloud_drive', 'uc', 'https://drive.uc.cn/s/uc_wukong_pc', 'hash_uc_wukong', NULL, NULL, 128000000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 93.0, '{"category":"game"}', 1704067200000, 1704067200000),
(505, 'canon-black-myth-wukong-pc', '黑神话：悟空 123云盘免登录直下 解压即玩', '黑神话悟空 123云盘', 'cloud_drive', '123pan', 'https://www.123pan.com/s/123_wukong_pc', 'hash_123_wukong', NULL, NULL, 128000000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.92, 90.0, '{"category":"game"}', 1704067200000, 1704067200000),
(506, 'canon-black-myth-wukong-pc', '黑神话：悟空 115VIP 蓝光原生特种解压包 访问码: 115w', '黑神话悟空 115网盘', 'cloud_drive', '115', 'https://115.com/s/115_wukong_pc', 'hash_115_wukong', NULL, '115w', 128000000000, 1, 6, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 91.0, '{"category":"game"}', 1704067200000, 1704067200000),

-- 繁花
(601, 'canon-blossoms-shanghai-4k', '繁花 (2023) S01 全30集 4K 沪语/普通话 双语 60帧 夸克', '繁花 2023 4k 全集 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_blossoms_4k', 'hash_quark_blossoms', NULL, NULL, 95000000000, 30, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 95.0, '{"resolution":"2160p","episodes":30}', 1704067200000, 1704067200000),
(602, 'canon-blossoms-shanghai-4k', '繁花 4K 沪语版 阿里云盘 高清收藏', '繁花 4k 阿里云盘', 'cloud_drive', 'aliyun', 'https://www.alipan.com/s/ali_blossoms', 'hash_ali_blossoms', NULL, NULL, 92000000000, 30, 4, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 91.0, '{"resolution":"2160p"}', 1704067200000, 1704067200000),

-- 庆余年 第二季 (影视剧集 - 覆盖全部 11 种存储渠道)
(701, 'canon-joy-of-life-2-4k', '庆余年 第二季 (2024) 4K 原画 全集未删减 夸克网盘', '庆余年 第二季 2024 4k 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_joy_life_2', 'hash_quark_joy2', NULL, NULL, 88000000000, 36, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 96.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(702, 'canon-joy-of-life-2-4k', '庆余年2 S02 全集 4K 杜比视界 阿里云盘', '庆余年 第二季 阿里 4k', 'cloud_drive', 'aliyun', 'https://www.alipan.com/s/ali_joy_life_2', 'hash_ali_joy2', NULL, NULL, 89000000000, 36, 4, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 93.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(703, 'canon-joy-of-life-2-4k', '庆余年 第二季 百度网盘 4K 提取码: qyn2', '庆余年 第二季 百度网盘', 'cloud_drive', 'baidu', 'https://pan.baidu.com/s/1joy_life_2_bd', 'hash_baidu_joy2', NULL, 'qyn2', 45000000000, 36, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.91, 88.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(704, 'canon-joy-of-life-2-4k', '庆余年 第二季 迅雷云盘 4K 原画高速下载', '庆余年 第二季 迅雷', 'cloud_drive', 'xunlei', 'https://pan.xunlei.com/s/xl_joy_life_2', 'hash_xl_joy2', NULL, NULL, 86000000000, 36, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.93, 85.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(705, 'canon-joy-of-life-2-4k', '庆余年 第二季 天翼云盘 4K 高清原画 (全36集) 提取码: ty66', '庆余年 第二季 天翼云盘', 'cloud_drive', 'tianyi', 'https://cloud.189.cn/web/share?code=tianyi_joy2', 'hash_tianyi_joy2', NULL, 'ty66', 88000000000, 36, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 87.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(706, 'canon-joy-of-life-2-4k', '庆余年 第二季 中国移动云盘 4K 全集原画 提取码: yd88', '庆余年 第二季 移动云盘', 'cloud_drive', 'mobile', 'https://caiyun.139.com/m/i?105Cqm_joy2', 'hash_mobile_joy2', NULL, 'yd88', 88000000000, 36, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.93, 86.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(707, 'canon-joy-of-life-2-4k', '庆余年 第二季 UC网盘 4K 原画极速转存', '庆余年 第二季 uc网盘', 'cloud_drive', 'uc', 'https://drive.uc.cn/s/uc_joy_life_2_4k', 'hash_uc_joy2', NULL, NULL, 88000000000, 36, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.92, 84.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(708, 'canon-joy-of-life-2-4k', '庆余年 第二季 115网盘 4K 原生蓝光典藏版 访问码: 115q', '庆余年 第二季 115网盘', 'cloud_drive', '115', 'https://115.com/s/115_joy_life_2', 'hash_115_joy2', NULL, '115q', 88000000000, 36, 6, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 89.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(709, 'canon-joy-of-life-2-4k', '庆余年 第二季 123云盘 4K 超清免登录直下', '庆余年 第二季 123云盘', 'cloud_drive', '123pan', 'https://www.123pan.com/s/123_joy_life_2', 'hash_123_joy2', NULL, NULL, 88000000000, 36, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.91, 83.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(710, 'canon-joy-of-life-2-4k', 'Joy.of.Life.S02.2024.2160p.WEB-DL.H265.AAC-MetaHD', 'joy of life season 2 2160p web dl magnet', 'magnet', 'magnet', 'magnet:?xt=urn:btih:7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b&dn=Joy.of.Life.S02.2160p', 'hash_magnet_joy2', '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b', NULL, 88000000000, 36, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.98, 95.0, '{"seeders":142,"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(713, 'canon-joy-of-life-2-4k', 'Joy.of.Life.S02.Complete.4K.HEVC.torrent', 'joy of life season 2 complete 4k torrent', 'torrent', 'torrent', 'https://tracker.example.com/torrents/joy_of_life_s02_4k.torrent', 'hash_torrent_joy2', '8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c', NULL, 88000000000, 36, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 91.0, '{"seeders":86,"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),

-- 庆余年 第一季 (影视剧集)
(711, 'canon-joy-of-life-1-4k', '庆余年 第一季 (2019) 4K 60帧 修复版 全46集 夸克网盘', '庆余年 第一季 2019 4k 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_joy_life_1', 'hash_quark_joy1', NULL, NULL, 96000000000, 46, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 94.0, '{"resolution":"2160p","category":"tv"}', 1704067200000, 1704067200000),
(712, 'canon-joy-of-life-1-4k', '庆余年 第一季 1080P 蓝光重制版 百度网盘 提取码: qyn1', '庆余年 第一季 百度', 'cloud_drive', 'baidu', 'https://pan.baidu.com/s/1joy_life_1_bd', 'hash_baidu_joy1', NULL, 'qyn1', 48000000000, 46, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.90, 86.0, '{"resolution":"1080p","category":"tv"}', 1704067200000, 1704067200000),

-- 庆余年 (图书小说)
(721, 'canon-joy-of-life-book', '庆余年 猫腻著 精排校对版全七卷 (EPUB/MOBI/PDF) 百度网盘 提取码: novel', '庆余年 小说 猫腻 百度', 'cloud_drive', 'baidu', 'https://pan.baidu.com/s/1joy_life_novel_bd', 'hash_baidu_joy_book', NULL, 'novel', 65000000, 3, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.98, 92.0, '{"category":"book","author":"猫腻"}', 1704067200000, 1704067200000),
(722, 'canon-joy-of-life-book', '庆余年 原著未删节典藏版 夸克网盘秒存', '庆余年 原著 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_joy_life_novel', 'hash_quark_joy_book', NULL, NULL, 72000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 89.0, '{"category":"book","author":"猫腻"}', 1704067200000, 1704067200000),

-- 海贼王 (动漫)
(731, 'canon-one-piece-anime', '【动漫花园】海贼王 / 航海王 One Piece 1080P 全集精校中字 夸克网盘', '海贼王 航海王 one piece 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_one_piece_1080p', 'hash_quark_one_piece', NULL, NULL, 320000000000, 1120, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 98.0, '{"resolution":"1080p","category":"anime"}', 1704067200000, 1704067200000),
(732, 'canon-one-piece-anime', 'One.Piece.BDRip.1080p.x265.10bit.FLAC-SubsPlease', 'one piece 1080p x265 magnet', 'magnet', 'magnet', 'magnet:?xt=urn:btih:f1e2d3c4b5a678901234567890abcdef12345678&dn=One.Piece.1080p', 'hash_magnet_one_piece', 'f1e2d3c4b5a678901234567890abcdef12345678', NULL, 280000000000, 1120, 2, 1704067200000, 1704067200000, 1704067200000, 'active', 0.98, 97.0, '{"resolution":"1080p","category":"anime"}', 1704067200000, 1704067200000),

-- 间谍过家家 (动漫)
(741, 'canon-spy-family-s2', '【喵萌奶茶屋】SPY×FAMILY 间谍家家酒 第二季 1080p 简日双语 阿里云盘', 'spy family season 2 阿里', 'cloud_drive', 'aliyun', 'https://www.alipan.com/s/ali_spy_family_s2', 'hash_ali_spy2', NULL, NULL, 12000000000, 12, 4, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 92.0, '{"resolution":"1080p","category":"anime"}', 1704067200000, 1704067200000),

-- 三体 (图书 - 涵盖123/天翼/移动/UC)
(751, 'canon-three-body-book', '三体三部曲典藏精排版 (三体/黑暗森林/死神永生) 123云盘免登录直下', '三体 全集 123云盘', 'cloud_drive', '123pan', 'https://www.123pan.com/s/123_three_body_book', 'hash_123_three_body', NULL, NULL, 45000000, 3, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.98, 95.0, '{"category":"book","author":"刘慈欣"}', 1704067200000, 1704067200000),
(752, 'canon-three-body-book', '三体全集 (精排精校版) 天翼云盘极速下载 提取码: 3bty', '三体 全集 天翼云盘', 'cloud_drive', 'tianyi', 'https://cloud.189.cn/web/share?code=tianyi_threebody', 'hash_tianyi_threebody', NULL, '3bty', 45000000, 3, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 92.0, '{"category":"book","author":"刘慈欣"}', 1704067200000, 1704067200000),
(753, 'canon-three-body-book', '三体全集 中国移动云盘 免流直存 提取码: 3byd', '三体 全集 移动云盘', 'cloud_drive', 'mobile', 'https://caiyun.139.com/m/i?105Cqm_threebody', 'hash_mobile_threebody', NULL, '3byd', 45000000, 3, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 90.0, '{"category":"book","author":"刘慈欣"}', 1704067200000, 1704067200000),
(754, 'canon-three-body-book', '三体 全三部合集 EPUB+PDF UC网盘秒存', '三体 全集 uc网盘', 'cloud_drive', 'uc', 'https://drive.uc.cn/s/uc_three_body', 'hash_uc_threebody', NULL, NULL, 45000000, 3, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 88.0, '{"category":"book","author":"刘慈欣"}', 1704067200000, 1704067200000),

-- 周杰伦 (音乐 - 涵盖百度/天翼/移动/夸克)
(761, 'canon-jay-chou-music', '周杰伦 2000-2024 15张录音室专辑+单曲母带 FLAC/APE 百度网盘 提取码: jay6', '周杰伦 专辑 flac 无损 百度', 'cloud_drive', 'baidu', 'https://pan.baidu.com/s/1jay_chou_music_bd', 'hash_baidu_jay', NULL, 'jay6', 36000000000, 380, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.99, 99.0, '{"category":"music","artist":"周杰伦"}', 1704067200000, 1704067200000),
(762, 'canon-jay-chou-music', '周杰伦 全专辑无损母带 FLAC 天翼云盘 提取码: jty8', '周杰伦 专辑 flac 天翼', 'cloud_drive', 'tianyi', 'https://cloud.189.cn/web/share?code=tianyi_jay_flac', 'hash_tianyi_jay', NULL, 'jty8', 36000000000, 380, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.97, 95.0, '{"category":"music","artist":"周杰伦"}', 1704067200000, 1704067200000),
(763, 'canon-jay-chou-music', '周杰伦 2000-2024 经典专辑母带无损全集 夸克网盘高速直存', '周杰伦 专辑 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_jay_lossless', 'hash_quark_jay', NULL, NULL, 36000000000, 380, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.96, 94.0, '{"category":"music","artist":"周杰伦"}', 1704067200000, 1704067200000),
(764, 'canon-jay-chou-music', '周杰伦 全专辑 Hi-Res 24bit/96kHz 中国移动云盘 提取码: jyd8', '周杰伦 专辑 移动云盘', 'cloud_drive', 'mobile', 'https://caiyun.139.com/m/i?105Cqm_jay_lossless', 'hash_mobile_jay', NULL, 'jyd8', 36000000000, 380, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 92.0, '{"category":"music","artist":"周杰伦"}', 1704067200000, 1704067200000),

-- 艾尔登法环 (游戏)
(771, 'canon-elden-ring-game', '艾尔登法环：黄金树幽影 v1.12.3 中文豪华免安装绿色版 夸克网盘高速直连', '艾尔登法环 黄金树幽影 夸克', 'cloud_drive', 'quark', 'https://pan.quark.cn/s/qk_elden_ring_dlc', 'hash_quark_elden', NULL, NULL, 68000000000, 1, 5, 1704067200000, 1704067200000, 1704067200000, 'active', 0.98, 97.0, '{"category":"game"}', 1704067200000, 1704067200000),
(772, 'canon-elden-ring-game', '艾尔登法环 黄金树幽影 中文豪华免安装版 UC网盘极速转存', '艾尔登法环 uc网盘', 'cloud_drive', 'uc', 'https://drive.uc.cn/s/uc_elden_ring', 'hash_uc_elden', NULL, NULL, 68000000000, 1, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.93, 91.0, '{"category":"game"}', 1704067200000, 1704067200000),

-- 考研资料 (资料)
(781, 'canon-kaoyan-document', '2025-2026 全国硕士研究生统一招生考试政治/英语/数学核心讲义包 阿里云盘', '2025 考研资料 阿里', 'cloud_drive', 'aliyun', 'https://www.alipan.com/s/ali_kaoyan_2025', 'hash_ali_kaoyan', NULL, NULL, 58000000000, 85, 4, 1704067200000, 1704067200000, 1704067200000, 'active', 0.95, 91.0, '{"category":"document"}', 1704067200000, 1704067200000),
(782, 'canon-kaoyan-document', '2025/2026 全学科考研核心讲义包 中国移动云盘 提取码: ky88', '2025 考研资料 移动云盘', 'cloud_drive', 'mobile', 'https://caiyun.139.com/m/i?105Cqm_kaoyan25', 'hash_mobile_kaoyan', NULL, 'ky88', 58000000000, 85, 1, 1704067200000, 1704067200000, 1704067200000, 'active', 0.94, 89.0, '{"category":"document"}', 1704067200000, 1704067200000),

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
