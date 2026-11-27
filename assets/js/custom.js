// Visi laboratorinio darbo JavaScript pakeitimai aprašomi tik šiame faile

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================
  // 1. ĮGŪDŽIŲ MODULIO DUOMENYS, LOCAL STORAGE IR BŪSENA
  // =========================================================
  const SKILLS_STORAGE_KEY = "cv_skills_module_state_v1";

  const SKILLS_STORAGE_INITIAL = [
    { id: "skill-1", name: "Docker ir konteinerizacija", status: "Planuojama", xp: 50 },
    { id: "skill-2", name: "TypeScript tipizacija", status: "Planuojama", xp: 35 },
    { id: "skill-3", name: "REST API ir asinchroninis JS", status: "Mokomasi", xp: 65 },
    { id: "skill-4", name: "SQL užklausos ir indeksavimas", status: "Mokomasi", xp: 45 },
    { id: "skill-5", name: "Automatizuoti testai (Unit)", status: "Mokomasi", xp: 55 },
    { id: "skill-6", name: "Semantinis HTML5 ir CSS3", status: "Atlikta", xp: 80 },
    { id: "skill-7", name: "Git ir GitHub darbo eiga", status: "Atlikta", xp: 40 }
  ];

  const VALID_STATUSES = ["Planuojama", "Mokomasi", "Atlikta"];

  const STATUS_CONFIG = {
    Planuojama: {
      columnSelector: ".kanban-planned",
      badgeClass: "status-planned"
    },
    Mokomasi: {
      columnSelector: ".kanban-learning",
      badgeClass: "status-learning"
    },
    Atlikta: {
      columnSelector: ".kanban-done",
      badgeClass: "status-done"
    }
  };

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function saveSkillsToStorage(skills) {
    try {
      const payload = skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        status: VALID_STATUSES.includes(skill.status) ? skill.status : "Planuojama",
        xp: Number(skill.xp || 0)
      }));
      localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Nepavyko išsaugoti įgūdžių būsenų į Local Storage:", error);
    }
  }

  function loadSkillsFromStorage(initialSkills) {
    const fallback = initialSkills.map((item) => ({ ...item }));
    try {
      const raw = localStorage.getItem(SKILLS_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return fallback;
      }

      const byId = new Map(
        parsed
          .filter((item) => item && typeof item.id === "string")
          .map((item) => [item.id, item])
      );

      return fallback.map((initialItem) => {
        const savedItem = byId.get(initialItem.id);
        if (!savedItem) return initialItem;

        const validStatus = VALID_STATUSES.includes(savedItem.status)
          ? savedItem.status
          : initialItem.status;

        return {
          ...initialItem,
          status: validStatus
        };
      });
    } catch (error) {
      console.warn("Nepavyko nuskaityti įgūdžių būsenų iš Local Storage:", error);
      return fallback;
    }
  }

  let skillsState = loadSkillsFromStorage(SKILLS_STORAGE_INITIAL);

  // =========================================================
  // 2. ĮGŪDŽIŲ MODULIO SKAIČIAVIMAI, ATVAIZDAVIMAS IR UI
  // =========================================================
  function calculateModuleProgress(skills) {
    const totalSkills = skills.length;
    const completedSkillsList = skills.filter((s) => s.status === "Atlikta");
    const completedSkills = completedSkillsList.length;
    const completedPercentage =
      totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;

    const totalXp = skills.reduce((sum, s) => sum + Number(s.xp || 0), 0);
    const earnedXp = completedSkillsList.reduce(
      (sum, s) => sum + Number(s.xp || 0),
      0
    );

    let level = 1;
    let rank = "Pradedantysis";
    let progressPercent = 0;

    if (earnedXp >= 300) {
      level = 4;
      rank = "Profesionalas";
      progressPercent = 100;
    } else if (earnedXp >= 150) {
      level = 3;
      rank = "Specialistas";
      progressPercent = Math.round(((earnedXp - 150) / (300 - 150)) * 100);
    } else if (earnedXp >= 50) {
      level = 2;
      rank = "Praktikantas";
      progressPercent = Math.round(((earnedXp - 50) / (150 - 50)) * 100);
    } else {
      level = 1;
      rank = "Pradedantysis";
      progressPercent = Math.round((earnedXp / 50) * 100);
    }

    progressPercent = Math.max(0, Math.min(100, progressPercent));
    const remainingPercent = Math.max(0, 100 - progressPercent);

    return {
      totalSkills,
      completedSkills,
      completedPercentage,
      totalXp,
      earnedXp,
      level,
      rank,
      progressPercent,
      remainingPercent
    };
  }

  function getOrCreateColumnCardsContainer(columnEl) {
    if (!columnEl) return null;

    let cardsContainer = columnEl.querySelector(".kanban-cards");
    if (!cardsContainer) {
      cardsContainer = document.createElement("div");
      cardsContainer.className = "kanban-cards";
      columnEl.appendChild(cardsContainer);
    }

    // Jei HTML šablone buvo statinių .skill-card elementų, išvalome tik juos,
    // kad nenukentėtų .kanban-column-header ar kiti pagalbiniai elementai
    columnEl.querySelectorAll(":scope > .skill-card").forEach((staticCard) => {
      staticCard.remove();
    });

    return cardsContainer;
  }

  function renderSkillCards(skills, onStatusChange) {
    const containers = {};

    VALID_STATUSES.forEach((statusName) => {
      const columnEl = document.querySelector(STATUS_CONFIG[statusName].columnSelector);
      const container = getOrCreateColumnCardsContainer(columnEl);
      if (container) {
        container.innerHTML = "";
        containers[statusName] = container;
      }
    });

    if (Object.keys(containers).length === 0) return;

    skills.forEach((skill) => {
      const targetContainer = containers[skill.status];
      if (!targetContainer) return;

      const badgeClass = STATUS_CONFIG[skill.status]?.badgeClass || "";
      const optionsHtml = VALID_STATUSES.map((statusOption) => {
        const selectedAttr = statusOption === skill.status ? " selected" : "";
        return `<option value="${escapeHtml(statusOption)}"${selectedAttr}>${escapeHtml(statusOption)}</option>`;
      }).join("");

      const card = document.createElement("article");
      card.className = "skill-card";
      card.dataset.skillId = skill.id;
      card.dataset.status = skill.status;
      card.dataset.xp = String(skill.xp);

      card.innerHTML = `
        <div class="skill-card-top">
          <span class="skill-status ${badgeClass}">${escapeHtml(skill.status)}</span>
          <span class="skill-xp">${escapeHtml(skill.xp)} XP</span>
        </div>
        <h5 class="skill-title">${escapeHtml(skill.name)}</h5>
        <div class="mt-2">
          <label class="visually-hidden" for="status-${escapeHtml(skill.id)}">Būsena</label>
          <select id="status-${escapeHtml(skill.id)}" class="form-select form-select-sm skill-status-select" aria-label="Keisti įgūdžio būseną">
            ${optionsHtml}
          </select>
        </div>
      `;

      const selectEl = card.querySelector(".skill-status-select");
      if (selectEl && typeof onStatusChange === "function") {
        selectEl.addEventListener("change", (event) => {
          onStatusChange(skill.id, event.target.value);
        });
      }

      targetContainer.appendChild(card);
    });
  }

  function updateModuleSummaryUI(skills, metrics) {
    // 1. Stulpelių kortelių skaitikliai
    VALID_STATUSES.forEach((statusName) => {
      const count = skills.filter((s) => s.status === statusName).length;
      const columnEl = document.querySelector(STATUS_CONFIG[statusName].columnSelector);
      const countEl = columnEl?.querySelector(".kanban-count");
      if (countEl) {
        countEl.textContent = String(count);
      }
    });

    // 2. Suvestinė virš lentos
    const summaryEl = document.querySelector(".skill-kanban-summary");
    if (summaryEl) {
      summaryEl.innerHTML = `
        <span>Viso surinkta / suplanuota: <strong>${metrics.earnedXp} XP</strong> / ${metrics.totalXp} XP</span>
        <span>${metrics.totalSkills} įgūdžiai</span>
      `;
    }

    // 3. XP, lygio ir rango kortelės
    const xpPointsValue = document.querySelector(".xp-stat-points .xp-stat-value");
    if (xpPointsValue) {
      xpPointsValue.textContent = `${metrics.earnedXp} XP`;
    }

    const levelValue = document.querySelector(".xp-stat-level .xp-stat-value");
    if (levelValue) {
      levelValue.textContent = `${metrics.level} lygis`;
    }

    const rankValue = document.querySelector(".xp-stat-rank .xp-stat-value");
    if (rankValue) {
      rankValue.textContent = metrics.rank;
    }

    // 4. Progreso juosta ir jos aprašymai
    const progressSubtitle = document.querySelector(".xp-progress-subtitle");
    if (progressSubtitle) {
      progressSubtitle.innerHTML = `Dabartinis rezultatas: <strong>${metrics.earnedXp} XP</strong> (${metrics.level} lygis — ${escapeHtml(metrics.rank)})`;
    }

    const progressPercentEl = document.querySelector(".xp-progress-percent");
    if (progressPercentEl) {
      progressPercentEl.textContent = `${metrics.progressPercent} %`;
    }

    const progressBar = document.querySelector(".xp-progress-track");
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", String(metrics.progressPercent));
    }

    const progressFill = document.querySelector(".xp-progress-fill");
    if (progressFill) {
      progressFill.style.width = `${metrics.progressPercent}%`;
    }

    const progressFooterSpans = document.querySelectorAll(".xp-progress-footer span");
    if (progressFooterSpans.length >= 2) {
      progressFooterSpans[0].innerHTML = `Užpildyta dalis: <strong>${metrics.progressPercent} %</strong> (${metrics.earnedXp} XP)`;
      progressFooterSpans[1].innerHTML = `Likusi dalis: <strong>${metrics.remainingPercent} %</strong> (iki 100 % ribos)`;
    }

    // 5. Įgūdžių statistikos skydelis
    const statItems = document.querySelectorAll(".skill-stats-panel .skill-stat-item");
    if (statItems.length >= 3) {
      const totalVal = statItems[0].querySelector(".skill-stat-value");
      if (totalVal) totalVal.textContent = String(metrics.totalSkills);

      const completedVal = statItems[1].querySelector(".skill-stat-value");
      if (completedVal) completedVal.textContent = String(metrics.completedSkills);

      const percentVal = statItems[2].querySelector(".skill-stat-value");
      if (percentVal) percentVal.textContent = `${metrics.completedPercentage} %`;

      const percentNote = statItems[2].querySelector(".skill-stat-note");
      if (percentNote) {
        percentNote.textContent = `${metrics.completedSkills} iš ${metrics.totalSkills} įgūdžių baigta`;
      }
    }
  }

  function handleSkillStatusChange(skillId, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) return;

    skillsState = skillsState.map((skill) =>
      skill.id === skillId ? { ...skill, status: newStatus } : skill
    );

    saveSkillsToStorage(skillsState);

    const metrics = calculateModuleProgress(skillsState);
    renderSkillCards(skillsState, handleSkillStatusChange);
    updateModuleSummaryUI(skillsState, metrics);
  }

  const initialMetrics = calculateModuleProgress(skillsState);
  renderSkillCards(skillsState, handleSkillStatusChange);
  updateModuleSummaryUI(skillsState, initialMetrics);

  // =========================================================
  // 3. KONTAKTŲ FORMA: VALIDACIJA, TELEFONAS, VIDURKIS, IŠVALYMAS
  // =========================================================
  const contactForm = document.getElementById("customContactForm");
  if (!contactForm) return;

  const firstNameInput = contactForm.querySelector("#contactFirstName");
  const lastNameInput = contactForm.querySelector("#contactLastName");
  const emailInput = contactForm.querySelector("#contactEmail");
  const phoneInput = contactForm.querySelector("#contactPhone");
  const addressInput = contactForm.querySelector("#contactAddress");
  const ratingInputs = Array.from(contactForm.querySelectorAll(".rating-range"));
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const clearButton = contactForm.querySelector("#clearContactFormBtn");
  const resultBox = document.getElementById("contactFormResult");

  const lettersOnlyRegex = /^[A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const formatLtPhone = (rawValue) => {
    let digits = String(rawValue ?? "").replace(/\D/g, "");
    if (!digits) return "";

    if (digits.startsWith("8") && digits.length <= 9) {
      digits = "370" + digits.slice(1);
    } else if (!digits.startsWith("370")) {
      digits = "370" + digits;
    }

    digits = digits.slice(0, 11);

    const country = digits.slice(0, 3);
    const operatorPart = digits.slice(3, 6);
    const subscriberPart = digits.slice(6, 11);

    let formatted = `+${country}`;
    if (operatorPart.length > 0) {
      formatted += ` ${operatorPart}`;
    }
    if (subscriberPart.length > 0) {
      formatted += ` ${subscriberPart}`;
    }

    return formatted;
  };

  const getErrorElement = (field) =>
    contactForm.querySelector(`[data-error-for="${field.id}"]`);

  const setFieldState = (field, errorMessage, showError) => {
    const errorEl = getErrorElement(field);
    const hasError = Boolean(errorMessage);

    if (showError && hasError) {
      field.classList.add("is-invalid");
      if (errorEl) {
        errorEl.textContent = errorMessage;
      }
    } else {
      field.classList.remove("is-invalid");
      if (errorEl) {
        errorEl.textContent = "";
      }
    }

    return !hasError;
  };

  const validateField = (field, showError = false) => {
    if (!field) return true;

    if (field === firstNameInput || field === lastNameInput) {
      const label = field === firstNameInput ? "Vardas" : "Pavardė";
      const val = field.value.trim();
      let msg = "";

      if (!val) {
        msg = `${label} yra privalomas laukas.`;
      } else if (!lettersOnlyRegex.test(val)) {
        msg = `${label} gali sudaryti tik raidės (be tarpų, skaičių ar simbolių).`;
      }

      return setFieldState(field, msg, showError);
    }

    if (field === emailInput) {
      const val = field.value.trim();
      let msg = "";

      if (!val) {
        msg = "El. pašto adresas yra privalomas.";
      } else if (!emailRegex.test(val)) {
        msg = "Įveskite tinkamą el. pašto adresą (pvz., vardas@pastas.lt).";
      }

      return setFieldState(field, msg, showError);
    }

    if (field === addressInput) {
      const val = field.value.trim();
      const msg = !val ? "Adresas yra privalomas laukas." : "";
      return setFieldState(field, msg, showError);
    }

    if (field === phoneInput) {
      const val = field.value.trim();
      let msg = "";

      if (!val) {
        msg = "Telefono numeris yra privalomas.";
      } else if (!/^\+370 6\d{2} \d{5}$/.test(val)) {
        msg = "Numeris turi būti lietuviško formato: +370 6xx xxxxx.";
      }

      return setFieldState(field, msg, showError);
    }

    if (field.classList.contains("rating-range")) {
      const num = Number(field.value);
      let msg = "";

      if (Number.isNaN(num) || !Number.isInteger(num) || num < 1 || num > 10) {
        msg = "Vertinimas turi būti sveikas skaičius nuo 1 iki 10.";
      }

      return setFieldState(field, msg, showError || Boolean(msg));
    }

    return true;
  };

  const allValidatedFields = [
    firstNameInput,
    lastNameInput,
    emailInput,
    phoneInput,
    addressInput,
    ...ratingInputs
  ].filter(Boolean);

  const updateSubmitButtonState = () => {
    const isFormValid = allValidatedFields.every((field) =>
      validateField(field, false)
    );

    if (submitButton) {
      submitButton.disabled = !isFormValid;
    }

    return isFormValid;
  };

  ratingInputs.forEach((input) => {
    const output = contactForm.querySelector(`output[for="${input.id}"]`);
    const updateValue = () => {
      if (output) {
        output.textContent = `${input.value} / 10`;
      }
      validateField(input, true);
      updateSubmitButtonState();
    };

    if (output) {
      output.textContent = `${input.value} / 10`;
    }

    input.addEventListener("input", updateValue);
    input.addEventListener("change", updateValue);
  });

  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      const formatted = formatLtPhone(phoneInput.value);
      if (phoneInput.value !== formatted) {
        phoneInput.value = formatted;
      }
      validateField(phoneInput, true);
      updateSubmitButtonState();
    });

    phoneInput.addEventListener("blur", () => {
      phoneInput.value = formatLtPhone(phoneInput.value);
      validateField(phoneInput, true);
      updateSubmitButtonState();
    });
  }

  [firstNameInput, lastNameInput, emailInput, addressInput]
    .filter(Boolean)
    .forEach((field) => {
      field.addEventListener("input", () => {
        validateField(field, true);
        updateSubmitButtonState();
      });

      field.addEventListener("blur", () => {
        validateField(field, true);
        updateSubmitButtonState();
      });
    });

  updateSubmitButtonState();

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    allValidatedFields.forEach((field) => {
      validateField(field, true);
    });

    if (!updateSubmitButtonState()) {
      return;
    }

    const formData = new FormData(contactForm);
    const r1 = Number(formData.get("ratingQuality"));
    const r2 = Number(formData.get("ratingCommunication"));
    const r3 = Number(formData.get("ratingRecommendation"));
    const averageScore = Number(((r1 + r2 + r3) / 3).toFixed(1));

    const submissionData = {
      vardas: String(formData.get("firstName") ?? "").trim(),
      pavarde: String(formData.get("lastName") ?? "").trim(),
      elPastas: String(formData.get("email") ?? "").trim(),
      telNumeris: String(formData.get("phone") ?? "").trim(),
      adresas: String(formData.get("address") ?? "").trim(),
      vertinimas1: r1,
      vertinimas2: r2,
      vertinimas3: r3,
      vidurkis: averageScore
    };

    console.log("Kontaktų formos duomenys:", submissionData);

    if (resultBox) {
      const fullName = `${submissionData.vardas} ${submissionData.pavarde}`.trim();
      const lines = [
        `Vardas: ${escapeHtml(submissionData.vardas)}`,
        `Pavardė: ${escapeHtml(submissionData.pavarde)}`,
        `El. paštas: ${escapeHtml(submissionData.elPastas)}`,
        `Tel. Numeris: ${escapeHtml(submissionData.telNumeris)}`,
        `Adresas: ${escapeHtml(submissionData.adresas)}`,
        `1 klausimas (1–10): ${escapeHtml(submissionData.vertinimas1)}`,
        `2 klausimas (1–10): ${escapeHtml(submissionData.vertinimas2)}`,
        `3 klausimas (1–10): ${escapeHtml(submissionData.vertinimas3)}`,
        `${escapeHtml(fullName)}: ${escapeHtml(submissionData.vidurkis)}`
      ];

      resultBox.classList.remove("d-none", "alert-danger");
      resultBox.classList.add("alert", "alert-light", "border", "mt-2");
      resultBox.style.whiteSpace = "pre-line";
      resultBox.innerHTML = lines.join("\n");
    }
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      contactForm.reset();

      ratingInputs.forEach((input) => {
        input.value = "5";
        const output = contactForm.querySelector(`output[for="${input.id}"]`);
        if (output) {
          output.textContent = "5 / 10";
        }
      });

      allValidatedFields.forEach((field) => {
        setFieldState(field, "", false);
      });

      if (resultBox) {
        resultBox.textContent = "";
        resultBox.className = "d-none";
        resultBox.removeAttribute("style");
      }

      updateSubmitButtonState();
    });
  }
});