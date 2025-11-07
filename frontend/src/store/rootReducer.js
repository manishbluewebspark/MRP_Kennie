import { combineReducers } from 'redux'
import theme from './slices/themeSlice'
import auth from './slices/authSlice'
import users from './slices/userSlice'
import customers from './slices/customerSlice'
import drawings from './slices/drawingSlice'
import skillLevelCosting from './slices/skillLevelCostingSlice'
import suppliers from './slices/supplierSlice'
import currency from './slices/currencySlice'
import categories from './slices/categorySlice'
import librarys from './slices/librarySlice'
import uoms from './slices/uomSlice'
import purchaseSettings from './slices/purchaseSettingSlice'
import markupParameter from './slices/markupParameterSlice'
import systemSettings from './slices/systemSettingsSlice'
import projects from './slices/ProjectSlice'
const rootReducer = (asyncReducers) => (state, action) => {
    const combinedReducer = combineReducers({
        theme,
        auth,
        users,
        librarys,
        customers,
        drawings,
        skillLevelCosting,
        suppliers,
        currency,
        categories,
        uoms,
        purchaseSettings,
        markupParameter,
        systemSettings,
        projects,
        ...asyncReducers,
    })
    return combinedReducer(state, action)
}
  
export default rootReducer
