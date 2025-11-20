const db = require('../database/config');

class Member {
  static async create(memberData) {
    const { 
      userId, firstName, lastName, address, city, state, zip,
      phone, callsign, county, fccLicensePath 
    } = memberData;

    const result = await db.run(
      `INSERT INTO members (
        user_id, first_name, last_name, address, city, state, zip,
        phone, callsign, county, fcc_license_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, firstName, lastName, address, city, state, zip, phone, callsign, county, fccLicensePath]
    );
    return result.lastID;
  }

  static async findByUserId(userId) {
    return await db.get('SELECT * FROM members WHERE user_id = ?', [userId]);
  }

  static async findById(id) {
    return await db.get(`
      SELECT m.*, u.email 
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [id]);
  }

  static async findByCallsign(callsign) {
    return await db.get('SELECT * FROM members WHERE callsign = ?', [callsign]);
  }

  static async update(memberId, memberData) {
    const fields = [];
    const values = [];

    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip',
      phone: 'phone',
      callsign: 'callsign',
      county: 'county',
      fccLicensePath: 'fcc_license_path',
      profilePhotoPath: 'profile_photo_path',
      licenseClass: 'license_class',
      title: 'title',
      status: 'status',
      backgroundCheck: 'background_check',
      backgroundCheckDate: 'background_check_date',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactRelationship: 'emergency_contact_relationship',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactEmail: 'emergency_contact_email',
      emergencyPower: 'emergency_power',
      emergencyPowerType: 'emergency_power_type',
      hfCapable: 'hf_capable',
      hfPower: 'hf_power',
      vhfUhfCapable: 'vhf_uhf_capable',
      vhfUhfPower: 'vhf_uhf_power',
      winlinkCapable: 'winlink_capable',
      satelliteInternet: 'satellite_internet',
      mobileStation: 'mobile_station',
      portableStation: 'portable_station',
      aprsCapable: 'aprs_capable',
      dstarCapable: 'dstar_capable',
      dmrCapable: 'dmr_capable',
      fusionCapable: 'fusion_capable',
      packetRadio: 'packet_radio',
      sstvCapable: 'sstv_capable',
      rttyCapable: 'rtty_capable',
      ft8Capable: 'ft8_capable',
      js8callCapable: 'js8call_capable',
      goKitReady: 'go_kit_ready',
      towerAntennaHeight: 'tower_antenna_height',
      backupBatteries: 'backup_batteries',
      solarPower: 'solar_power',
      meshNetwork: 'mesh_network',
      firstnetDevice: 'firstnet_device',
      capabilitiesNotes: 'capabilities_notes',
      adminNotes: 'admin_notes'
    };

    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (memberData[key] !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(memberData[key]);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(memberId);

    await db.run(
      `UPDATE members SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async getAll() {
    return await db.all(`
      SELECT m.*, u.email, t.name as tier_name
      FROM members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN member_tiers mt ON m.id = mt.member_id AND mt.achieved = 1
      LEFT JOIN tiers t ON mt.tier_id = t.id
      LEFT JOIN (
        SELECT member_id, MAX(tier_id) as max_tier_id
        FROM member_tiers
        WHERE achieved = 1
        GROUP BY member_id
      ) max_tier ON m.id = max_tier.member_id AND t.id = max_tier.max_tier_id
      ORDER BY m.last_name, m.first_name
    `);
  }

  static async getDirectory() {
    return await db.all(`
      SELECT 
        m.id, m.first_name, m.last_name, m.callsign, m.county, 
        m.phone, m.city, m.state
      FROM members m
      ORDER BY m.last_name, m.first_name
    `);
  }

  static async getWithProgress(memberId) {
    const member = await this.findById(memberId);
    if (!member) return null;

    // Get tier progress
    const tiers = await db.all(`
      SELECT 
        t.id, t.name, t.description, t.sort_order,
        mt.achieved, mt.achieved_at,
        COUNT(tasks.id) as total_tasks,
        COUNT(CASE WHEN member_tasks.verified = 1 THEN 1 END) as completed_tasks
      FROM tiers t
      LEFT JOIN tasks ON t.id = tasks.tier_id
      LEFT JOIN member_tasks ON tasks.id = member_tasks.task_id AND member_tasks.member_id = ?
      LEFT JOIN member_tiers mt ON t.id = mt.tier_id AND mt.member_id = ?
      GROUP BY t.id
      ORDER BY t.sort_order
    `, [memberId, memberId]);

    // Get special achievements (only ones the member has)
    const achievements = await db.all(`
      SELECT 
        sa.id, sa.name, sa.description, sa.admin_only, sa.requires_proof,
        msa.verified, msa.verified_at, msa.proof_file_path,
        msa.granted_by, msa.granted_at,
        m1.first_name || ' ' || m1.last_name as granted_by_name,
        m2.first_name || ' ' || m2.last_name as verified_by_name
      FROM member_special_achievements msa
      INNER JOIN special_achievements sa ON sa.id = msa.achievement_id
      LEFT JOIN members m1 ON msa.granted_by = m1.user_id
      LEFT JOIN members m2 ON msa.verified_by = m2.user_id
      WHERE msa.member_id = ?
    `, [memberId]);

    return {
      ...member,
      tiers,
      achievements
    };
  }

  static async getCurrentTier(memberId) {
    return await db.get(`
      SELECT t.*
      FROM tiers t
      JOIN member_tiers mt ON t.id = mt.tier_id
      WHERE mt.member_id = ? AND mt.achieved = 1
      ORDER BY t.sort_order DESC
      LIMIT 1
    `, [memberId]);
  }
}

module.exports = Member;
