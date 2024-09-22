// src/models/Candidate.js
class Candidate {
    constructor({
      email,
      phone,
      name,
      summary,
      experience,
      education,
      skills,
      certifications,
      linkedin,
      portfolio,
      embedding,
    }) {
      this.email = email;
      this.phone = phone;
      this.name = name;
      this.summary = summary;
      this.experience = experience;
      this.education = education;
      this.skills = skills;
      this.certifications = certifications;
      this.linkedin = linkedin;
      this.portfolio = portfolio;
      this.embedding = embedding;
    }
  }
  
  module.exports = Candidate;