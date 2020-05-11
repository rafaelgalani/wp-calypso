/**
 * External dependencies
 *
 */
import PropTypes from 'prop-types';
import React, { Component, createElement } from 'react';
import { connect } from 'react-redux';
import { camelCase } from 'lodash';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import { getCountryStates } from 'state/country-states/selectors';
import { CountrySelect, Input, HiddenInput } from 'my-sites/domains/components/form';
import FormFieldset from 'components/forms/form-fieldset';
import FormPhoneMediaInput from 'components/forms/form-phone-media-input';
import { countries } from 'components/phone-input/data';
import formState from 'lib/form-state';
import { toIcannFormat } from 'components/phone-input/phone-number';
import RegionAddressFieldsets from './custom-form-fieldsets/region-address-fieldsets';
import getCountries from 'state/selectors/get-countries';
import QueryDomainCountries from 'components/data/query-countries/domains';
import {
	CONTACT_DETAILS_FORM_FIELDS,
	CHECKOUT_EU_ADDRESS_FORMAT_COUNTRY_CODES,
	CHECKOUT_UK_ADDRESS_FORMAT_COUNTRY_CODES,
} from './custom-form-fieldsets/constants';
import { getPostCodeLabelText } from './custom-form-fieldsets/utils';

/**
 * Style dependencies
 */
import './style.scss';

/* eslint-disable wpcalypso/jsx-classname-namespace */

export class ManagedContactDetailsFormFields extends Component {
	static propTypes = {
		eventFormName: PropTypes.string,
		contactDetails: PropTypes.shape(
			Object.assign(
				{},
				...CONTACT_DETAILS_FORM_FIELDS.map( ( field ) => ( { [ field ]: PropTypes.string } ) )
			)
		).isRequired,
		contactDetailsErrors: PropTypes.shape(
			Object.assign(
				{},
				...CONTACT_DETAILS_FORM_FIELDS.map( ( field ) => ( { [ field ]: PropTypes.string } ) )
			)
		),
		countriesList: PropTypes.array.isRequired,
		onContactDetailsChange: PropTypes.func.isRequired,
		getIsFieldDisabled: PropTypes.func,
		userCountryCode: PropTypes.string,
		needsOnlyGoogleAppsDetails: PropTypes.bool,
		needsAlternateEmailForGSuite: PropTypes.bool,
		hasCountryStates: PropTypes.bool,
		translate: PropTypes.func,
	};

	static defaultProps = {
		eventFormName: 'Domain contact details form',
		contactDetails: Object.assign(
			{},
			...CONTACT_DETAILS_FORM_FIELDS.map( ( field ) => ( { [ field ]: '' } ) )
		),
		getIsFieldDisabled: () => {},
		onContactDetailsChange: () => {},
		needsOnlyGoogleAppsDetails: false,
		needsAlternateEmailForGSuite: false,
		hasCountryStates: false,
		translate: ( x ) => x,
		userCountryCode: 'US',
	};

	constructor( props ) {
		super( props );
		this.state = {
			phoneCountryCode: this.props.countryCode || this.props.userCountryCode,
			form: {},
		};
	}

	static getDerivedStateFromProps( props, state ) {
		return {
			...state,
			...getStateFromContactDetails( props.contactDetails, props.contactDetailsErrors ),
		};
	}

	setStateAndUpdateParent = ( newState ) => {
		this.setState( newState, () => {
			this.props.onContactDetailsChange(
				getMainFieldValues(
					newState.form,
					this.props.countryCode,
					this.state.phoneCountryCode,
					this.props.hasCountryStates
				)
			);
		} );
	};

	handleFieldChange = ( event ) => {
		const { name, value } = event.target;
		const newState = { ...this.state };

		if ( name === 'country-code' && value && ! newState.phone?.value ) {
			newState.phoneCountryCode = value;
		}

		newState.form = updateFormWithContactChange( newState.form, name, value );
		if ( name === 'country-code' ) {
			newState.form = updateFormWithContactChange( newState.form, 'state', '', {
				isShowingErrors: false,
			} );
		}

		this.setStateAndUpdateParent( newState );
		return;
	};

	handlePhoneChange = ( { value, countryCode } ) => {
		const newState = { ...this.state };

		if ( countries[ countryCode ] ) {
			newState.phoneCountryCode = countryCode;
		}

		newState.form = updateFormWithContactChange( newState.form, 'phone', value );
		this.setStateAndUpdateParent( newState );
		return;
	};

	getFieldProps = ( name, { customErrorMessage = null } ) => {
		const { eventFormName, getIsFieldDisabled } = this.props;
		const { form } = this.state;

		return {
			labelClass: 'contact-details-form-fields__label',
			additionalClasses: 'contact-details-form-fields__field',
			disabled: getIsFieldDisabled( name ) || formState.isFieldDisabled( form, name ),
			isError: formState.isFieldInvalid( form, name ),
			errorMessage:
				customErrorMessage ||
				( formState.getFieldErrorMessages( form, camelCase( name ) ) || [] ).join( '\n' ),
			onChange: this.handleFieldChange,
			value: formState.getFieldValue( form, name ) || '',
			name,
			eventFormName,
		};
	};

	createField = ( name, componentClass, additionalProps, fieldPropOptions = {} ) => {
		return createElement( componentClass, {
			...this.getFieldProps( name, fieldPropOptions ),
			...additionalProps,
		} );
	};

	renderContactDetailsFields() {
		const { translate, hasCountryStates } = this.props;
		const countryCode = this.state.form.countryCode?.value ?? '';

		return (
			<div className="contact-details-form-fields__contact-details">
				<div className="contact-details-form-fields__row">
					{ this.createField(
						'organization',
						HiddenInput,
						{
							label: translate( 'Organization' ),
							text: translate( '+ Add organization name' ),
						},
						{
							needsChildRef: true,
							customErrorMessage: this.props.contactDetailsErrors?.organization,
						}
					) }
				</div>

				<div className="contact-details-form-fields__row">
					{ this.createField(
						'email',
						Input,
						{
							label: translate( 'Email' ),
						},
						{
							customErrorMessage: this.props.contactDetailsErrors?.email,
						}
					) }

					{ this.createField(
						'phone',
						FormPhoneMediaInput,
						{
							label: translate( 'Phone' ),
							onChange: this.handlePhoneChange,
							countriesList: this.props.countriesList,
							countryCode: this.state.phoneCountryCode,
							enableStickyCountry: false,
						},
						{
							needsChildRef: true,
							customErrorMessage: this.props.contactDetailsErrors?.phone,
						}
					) }
				</div>

				<div className="contact-details-form-fields__row">
					{ this.createField(
						'country-code',
						CountrySelect,
						{
							label: translate( 'Country' ),
							countriesList: this.props.countriesList,
						},
						{
							customErrorMessage: this.props.contactDetailsErrors?.countryCode,
							needsChildRef: true,
						}
					) }
				</div>

				{ countryCode && (
					<RegionAddressFieldsets
						getFieldProps={ this.getFieldProps }
						countryCode={ countryCode }
						hasCountryStates={ hasCountryStates }
						shouldAutoFocusAddressField={ this.shouldAutoFocusAddressField }
						contactDetailsErrors={ this.props.contactDetailsErrors }
					/>
				) }
			</div>
		);
	}

	renderAlternateEmailFieldForGSuite() {
		return (
			<div className="contact-details-form-fields__row">
				<Input
					label={ this.props.translate( 'Alternate Email Address' ) }
					{ ...this.getFieldProps( 'alternate-email', {
						customErrorMessage: this.props.contactDetailsErrors?.alternateEmail,
					} ) }
				/>
			</div>
		);
	}

	render() {
		const { translate, contactDetailsErrors } = this.props;

		return (
			<FormFieldset className="contact-details-form-fields">
				<div className="contact-details-form-fields__row">
					{ this.createField(
						'first-name',
						Input,
						{
							label: translate( 'First name' ),
						},
						{
							customErrorMessage: contactDetailsErrors?.firstName,
						}
					) }

					{ this.createField(
						'last-name',
						Input,
						{
							label: translate( 'Last name' ),
						},
						{
							customErrorMessage: contactDetailsErrors?.lastName,
						}
					) }
				</div>
				{ this.props.needsAlternateEmailForGSuite && this.renderAlternateEmailFieldForGSuite() }

				{ this.props.needsOnlyGoogleAppsDetails ? (
					<GSuiteFields
						countryCode={ this.state.form.countryCode?.value ?? '' }
						countriesList={ this.props.countriesList }
						contactDetailsErrors={ this.props.contactDetailsErrors }
						getFieldProps={ this.getFieldProps }
						translate={ this.props.translate }
					/>
				) : (
					this.renderContactDetailsFields()
				) }

				<div className="contact-details-form-fields__extra-fields">{ this.props.children }</div>

				<QueryDomainCountries />
			</FormFieldset>
		);
	}
}

export default connect( ( state, props ) => {
	const contactDetails = props.contactDetails;
	const countryCode = contactDetails.countryCode;

	const hasCountryStates = contactDetails?.countryCode
		? !! getCountryStates( state, contactDetails.countryCode )?.length
		: false;
	return {
		countryCode,
		countriesList: getCountries( state, 'domains' ),
		hasCountryStates,
	};
} )( localize( ManagedContactDetailsFormFields ) );

function getStateFromContactDetails( contactDetails, contactDetailsErrors ) {
	const form = Object.keys( contactDetails ).reduce( ( newForm, key ) => {
		const value = contactDetails[ key ];
		const error = contactDetailsErrors[ key ];
		const errors = error ? [ error ] : [];
		return {
			...newForm,
			[ key ]: {
				value,
				errors,
				isShowingErrors: true,
				isPendingValidation: false,
				isValidating: false,
			},
		};
	}, {} );
	return { form };
}

function updateFormWithContactChange( form, key, value, additionalProperties ) {
	return {
		...form,
		[ camelCase( key ) ]: {
			value,
			errors: [],
			isShowingErrors: true,
			isPendingValidation: false,
			isValidating: false,
			...( additionalProperties ?? {} ),
		},
	};
}

function getMainFieldValues( form, countryCode, phoneCountryCode, hasCountryStates ) {
	const mainFieldValues = formState.getAllFieldValues( form );
	let state = mainFieldValues.state;

	const validatedHasCountryStates =
		mainFieldValues.countryCode === countryCode
			? hasCountryStates
			: !! getCountryStates( state, countryCode )?.length;

	// domains registered according to ancient validation rules may have state set even though not required
	if (
		! validatedHasCountryStates &&
		( CHECKOUT_EU_ADDRESS_FORMAT_COUNTRY_CODES.includes( countryCode ) ||
			CHECKOUT_UK_ADDRESS_FORMAT_COUNTRY_CODES.includes( countryCode ) )
	) {
		state = '';
	}

	const fax = '';

	return {
		...mainFieldValues,
		fax,
		state,
		phone: mainFieldValues.phone
			? toIcannFormat( mainFieldValues.phone, countries[ phoneCountryCode ] )
			: '',
	};
}

function GSuiteFields( {
	countryCode,
	countriesList,
	contactDetailsErrors,
	getFieldProps,
	translate,
} ) {
	return (
		<div className="contact-details-form-fields__row g-apps-fieldset">
			<CountrySelect
				label={ translate( 'Country' ) }
				countriesList={ countriesList }
				{ ...getFieldProps( 'country-code', {
					customErrorMessage: contactDetailsErrors?.countryCode,
				} ) }
			/>

			<Input
				label={ getPostCodeLabelText( countryCode ) }
				{ ...getFieldProps( 'postal-code', {
					customErrorMessage: contactDetailsErrors?.postalCode,
				} ) }
			/>
		</div>
	);
}