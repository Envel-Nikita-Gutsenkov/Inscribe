export type Locale = "en" | "ru";

export interface Translations {
  common: {
    home: string;
    settings: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    loading: string;
    search: string;
    copy: string;
    copied: string;
    verify: string;
    login: string;
    username: string;
    password: string;
    passcode: string;
    poweredBy: string;
  };
  home: {
    portalTitle: string;
    portalDescription: string;
    recommendedProjects: string;
    browseDocs: string;
    noProjects: string;
  };
  reader: {
    projectProtected: string;
    projectProtectedDesc: string;
    sectionProtected: string;
    sectionProtectedDesc: string;
    emptyProject: string;
    emptyProjectDesc: string;
    pageNotFound: string;
    pageNotFoundDesc: string;
    returnHome: string;
    showMenu: string;
    closeMenu: string;
    onThisPage: string;
    tocTitle: string;
    protectedBadge: string;
    invalidCredentials: string;
    accessGranted: string;
    lockProject: string;
    lockProjectTooltip: string;
  };
  search: {
    placeholder: string;
    quickSearch: string;
    noResults: string;
    recentSearches: string;
    clearRecent: string;
    pressEsc: string;
    allProjects: string;
  };
  preferences: {
    title: string;
    subtitle: string;
    saved: string;
    appearance: string;
    theme: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
    accentColor: string;
    colorBlue: string;
    colorPurple: string;
    colorEmerald: string;
    colorRose: string;
    colorAmber: string;
    colorCyan: string;
    typography: string;
    fontSize: string;
    appFont: string;
    layout: string;
    interfaceScale: string;
    compactMode: string;
    compactModeDesc: string;
    accessibility: string;
    reduceMotion: string;
    reduceMotionDesc: string;
    adminConsole: string;
    adminPanel: string;
    resetDefaults: string;
    done: string;
    fontFamily: string;
    lineSpacing: string;
    contentWidth: string;
  };
}

export const translations: Record<Locale, Translations> = {
  en: {
    common: {
      home: "Home",
      settings: "Settings",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      loading: "Loading...",
      search: "Search",
      copy: "Copy",
      copied: "Copied!",
      verify: "Verify",
      login: "Login",
      username: "Username",
      password: "Password",
      passcode: "Passcode",
      poweredBy: "Powered by Inscribe",
    },
    home: {
      portalTitle: "Welcome to Inscribe",
      portalDescription: "Search for articles or select a documentation workspace below to get started.",
      recommendedProjects: "Recommended Projects",
      browseDocs: "Browse Docs",
      noProjects: "No public documentation spaces are currently available. Log in to the Admin Console to create a project and add content.",
    },
    reader: {
      projectProtected: "Project Protected",
      projectProtectedDesc: "This project is private. Enter the passcode to view the documentation.",
      sectionProtected: "Protected Section",
      sectionProtectedDesc: "This section requires authentication. Enter your login and password to view its documentation.",
      emptyProject: "Project is empty",
      emptyProjectDesc: "This documentation workspace has no published articles yet.",
      pageNotFound: "Page not found",
      pageNotFoundDesc: "The requested documentation page could not be found.",
      returnHome: "Return to Home",
      showMenu: "Show menu",
      closeMenu: "Close menu",
      onThisPage: "On this page",
      tocTitle: "Table of Contents",
      protectedBadge: "Protected",
      invalidCredentials: "Invalid username or password.",
      accessGranted: "Access granted.",
      lockProject: "Clear access",
      lockProjectTooltip: "Clear saved access code on this device",
    },
    search: {
      placeholder: "Search documentation...",
      quickSearch: "Quick Search",
      noResults: "No results found for",
      recentSearches: "Recent Searches",
      clearRecent: "Clear",
      pressEsc: "ESC to close",
      allProjects: "All Projects",
    },
    preferences: {
      title: "Preferences",
      subtitle: "Customize your documentation reading experience",
      saved: "Saved",
      appearance: "Appearance",
      theme: "Theme",
      themeDark: "Dark",
      themeLight: "Light",
      themeSystem: "System",
      accentColor: "Accent Color",
      colorBlue: "Blue",
      colorPurple: "Purple",
      colorEmerald: "Emerald",
      colorRose: "Rose",
      colorAmber: "Amber",
      colorCyan: "Cyan",
      typography: "Typography",
      fontSize: "Font Size",
      appFont: "App Font",
      layout: "Layout",
      interfaceScale: "Interface Scale",
      compactMode: "Compact Mode",
      compactModeDesc: "Reduce padding and spacing",
      accessibility: "Accessibility",
      reduceMotion: "Reduce Motion",
      reduceMotionDesc: "Disable animations",
      adminConsole: "Admin Console",
      adminPanel: "Administration Panel",
      resetDefaults: "Reset defaults",
      done: "Done",
      fontFamily: "Font Family",
      lineSpacing: "Line Spacing",
      contentWidth: "Content Width",
    },
  },
  ru: {
    common: {
      home: "Главная",
      settings: "Настройки",
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      edit: "Редактировать",
      close: "Закрыть",
      loading: "Загрузка...",
      search: "Поиск",
      copy: "Копировать",
      copied: "Скопировано!",
      verify: "Подтвердить",
      login: "Войти",
      username: "Имя пользователя",
      password: "Пароль",
      passcode: "Код доступа",
      poweredBy: "Работает на Inscribe",
    },
    home: {
      portalTitle: "Добро пожаловать в Inscribe",
      portalDescription: "Ищите статьи или выберите проект документации ниже, чтобы начать чтение.",
      recommendedProjects: "Рекомендуемые проекты",
      browseDocs: "Читать документацию",
      noProjects: "В данный момент нет доступных публичных проектов. Войдите в панель администратора, чтобы создать проект и опубликовать статьи.",
    },
    reader: {
      projectProtected: "Проект защищен",
      projectProtectedDesc: "Этот проект приватный. Введите код доступа для просмотра документации.",
      sectionProtected: "Защищенный раздел",
      sectionProtectedDesc: "Этот раздел защищен. Введите логин и пароль для доступа к материалам раздела.",
      emptyProject: "Проект пуст",
      emptyProjectDesc: "В этом пространстве документации пока нет опубликованных статей.",
      pageNotFound: "Страница не найдена",
      pageNotFoundDesc: "Запрошенная страница документации не существует или была перемещена.",
      returnHome: "Вернуться на главную",
      showMenu: "Показать меню",
      closeMenu: "Скрыть меню",
      onThisPage: "На этой странице",
      tocTitle: "Оглавление",
      protectedBadge: "Защищено",
      invalidCredentials: "Неверный логин или пароль.",
      accessGranted: "Доступ разрешен.",
      lockProject: "Удалить данные доступа",
      lockProjectTooltip: "Удалить сохраненный код доступа на этом устройстве",
    },
    search: {
      placeholder: "Поиск по документации...",
      quickSearch: "Быстрый поиск",
      noResults: "Ничего не найдено по запросу",
      recentSearches: "Недавние поиски",
      clearRecent: "Очистить",
      pressEsc: "ESC для закрытия",
      allProjects: "Все проекты",
    },
    preferences: {
      title: "Настройки",
      subtitle: "Персонализируйте отображение документации",
      saved: "Сохранено",
      appearance: "Внешний вид",
      theme: "Тема оформления",
      themeDark: "Темная",
      themeLight: "Светлая",
      themeSystem: "Системная",
      accentColor: "Цвет акцента",
      colorBlue: "Синий",
      colorPurple: "Фиолетовый",
      colorEmerald: "Изумрудный",
      colorRose: "Розовый",
      colorAmber: "Янтарный",
      colorCyan: "Бирюзовый",
      typography: "Типографика",
      fontSize: "Размер шрифта",
      appFont: "Шрифт приложения",
      layout: "Макет",
      interfaceScale: "Масштаб интерфейса",
      compactMode: "Компактный режим",
      compactModeDesc: "Уменьшить отступы и интервалы",
      accessibility: "Специальные возможности",
      reduceMotion: "Уменьшить движение",
      reduceMotionDesc: "Отключить анимации",
      adminConsole: "Консоль администратора",
      adminPanel: "Панель управления",
      resetDefaults: "Сбросить по умолчанию",
      done: "Готово",
      fontFamily: "Шрифт",
      lineSpacing: "Межстрочный интервал",
      contentWidth: "Ширина контента",
    },
  },
};

export function getDictionary(locale?: string): Translations {
  const normalized = locale === "ru" ? "ru" : "en";
  return translations[normalized];
}
