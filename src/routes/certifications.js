const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { uploadProof } = require('../middleware/upload');
const Achievement = require('../models/Achievement');
const Member = require('../models/Member');

// View achievements
router.get('/', requireAuth, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.session.user.id);
    if (!member) {
      return res.redirect('/members/profile/edit');
    }

    const achievements = await Achievement.getMemberAchievements(member.id);
    res.render('certifications/list', { achievements });
  } catch (error) {
    console.error('Achievements error:', error);
    res.render('error', { message: 'Error loading achievements' });
  }
});

// Submit achievement
router.post('/:id/submit',
  requireAuth,
  uploadProof.single('proof'),
  async (req, res) => {
    try {
      const member = await Member.findByUserId(req.session.user.id);
      if (!member) {
        return res.redirect('/members/profile/edit');
      }

      const proofFilePath = req.file ? '/uploads/proofs/' + req.file.filename : null;
      await Achievement.submitForMember(member.id, req.params.id, proofFilePath, req.body.notes || '');

      res.redirect('/certifications');
    } catch (error) {
      console.error('Achievement submission error:', error);
      res.redirect('/certifications');
    }
  }
);

module.exports = router;
